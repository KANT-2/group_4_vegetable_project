"""주문 Repository. ORM 모델 ↔ 도메인·읽기 모델 변환과 잠금 쿼리를 담당한다."""

from uuid import UUID

from sqlalchemy import delete, func, or_, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.purchases.read_models import OrderItemView, OrderView, RefundView, ShippingView
from app.domain.purchases.cart import InsufficientStock, ProductInfo
from app.domain.purchases.order import Order
from app.infrastructure.purchases.models import CartItemModel, OrderItemModel, OrderModel, RefundRequestModel


def _to_refund(row: RefundRequestModel | None) -> RefundView | None:
    if row is None:
        return None
    return RefundView(status=row.status, reason=row.reason, created_at=row.created_at, reviewed_at=row.reviewed_at)


def _to_view(order: OrderModel, items: list[OrderItemModel], refund: RefundRequestModel | None = None) -> OrderView:
    return OrderView(
        id=order.id,
        status=order.status,
        payment_method=order.payment_method,
        shipping=ShippingView(
            recipient_name=order.recipient_name,
            recipient_phone=order.recipient_phone,
            postal_code=order.postal_code,
            address=order.address,
            address_detail=order.address_detail,
        ),
        items=tuple(
            OrderItemView(i.product_id, i.product_name, i.product_unit, i.unit_price, i.quantity)
            for i in sorted(items, key=lambda item: item.product_id)
        ),
        items_total=order.total_amount - order.shipping_fee,
        shipping_fee=order.shipping_fee,
        paid_at=order.paid_at,
        created_at=order.created_at,
        refund=_to_refund(refund),
    )


class SqlAlchemyOrderRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def lock_user(self, user_id: UUID) -> None:
        # 트랜잭션이 끝나면 자동으로 풀리는 사용자별 잠금. 기존 mock_checkout 과 같은 방식이다.
        await self._session.execute(
            text("select pg_advisory_xact_lock(hashtextextended(:user_id, 0))"), {"user_id": str(user_id)}
        )

    async def _items_of(self, order_ids: list[UUID]) -> dict[UUID, list[OrderItemModel]]:
        grouped: dict[UUID, list[OrderItemModel]] = {order_id: [] for order_id in order_ids}
        if order_ids:
            rows = await self._session.execute(select(OrderItemModel).where(OrderItemModel.order_id.in_(order_ids)))
            for item in rows.scalars():
                grouped[item.order_id].append(item)
        return grouped

    async def get_by_request_key(self, user_id: UUID, request_key: UUID) -> OrderView | None:
        row = (
            await self._session.execute(
                select(OrderModel).where(OrderModel.user_id == user_id, OrderModel.request_key == request_key)
            )
        ).scalar_one_or_none()
        if row is None:
            return None
        return _to_view(row, (await self._items_of([row.id]))[row.id])

    async def checkout_lines(self, user_id: UUID) -> list[tuple[ProductInfo, int]]:
        # 장바구니·상품 행 모두 쓰기 잠금: 주문하는 동안 수량·가격·판매 여부·재고가 바뀌지 않고,
        # 같은 상품을 동시에 주문하는 요청은 한 줄로 서서 마지막 재고를 두 사람이 사는 일(초과 판매)이 없다.
        rows = await self._session.execute(
            text(
                "select c.quantity, p.id, p.name, p.unit, p.price, p.is_active, p.image_path, p.stock "
                "from public.cart_items c join public.products p on p.id = c.product_id "
                "where c.user_id = :user_id order by c.product_id "
                "for update of c, p"
            ),
            {"user_id": user_id},
        )
        return [
            (
                ProductInfo(
                    id=r.id,
                    name=r.name,
                    unit=r.unit,
                    price=r.price,
                    is_active=r.is_active,
                    image_path=r.image_path,
                    stock=r.stock,
                ),
                r.quantity,
            )
            for r in rows
        ]

    async def add(self, order: Order) -> None:
        self._session.add(
            OrderModel(
                id=order.id,
                user_id=order.user_id,
                request_key=order.request_key,
                status=order.status.value,
                total_amount=order.total_amount,
                recipient_name=order.shipping.recipient_name,
                recipient_phone=order.shipping.recipient_phone,
                postal_code=order.shipping.postal_code,
                address=order.shipping.address,
                address_detail=order.shipping.address_detail,
                paid_at=order.paid_at,
                created_at=order.created_at,
                payment_method=order.payment_method.value,
                shipping_fee=order.shipping_fee,
            )
        )
        await self._session.flush()  # 주문 행을 먼저 만들어야 주문 상품의 외래키가 통과한다
        for item in order.items:
            self._session.add(
                OrderItemModel(
                    order_id=order.id,
                    product_id=item.product_id,
                    product_name=item.product_name,
                    product_unit=item.product_unit,
                    unit_price=item.unit_price,
                    quantity=item.quantity,
                )
            )
        await self._session.flush()

    async def decrease_stock(self, lines: list[tuple[str, int]]) -> None:
        for product_id, quantity in sorted(lines):
            # 조건부 차감: 잠금과 별개로 재고가 음수가 되는 일을 문장 자체에서 한 번 더 막는다.
            row = (
                await self._session.execute(
                    text(
                        "update public.products set stock = stock - :quantity, updated_at = now() "
                        "where id = :id and stock >= :quantity returning stock"
                    ),
                    {"id": product_id, "quantity": quantity},
                )
            ).first()
            if row is None:
                current = (
                    await self._session.execute(
                        text("select name, stock from public.products where id = :id"), {"id": product_id}
                    )
                ).first()
                raise InsufficientStock(current.name if current else product_id, current.stock if current else 0)

    async def remove_cart_items(self, user_id: UUID, product_ids: list[str]) -> None:
        await self._session.execute(
            delete(CartItemModel).where(CartItemModel.user_id == user_id, CartItemModel.product_id.in_(product_ids))
        )

    async def _refunds_of(self, order_ids: list[UUID]) -> dict[UUID, RefundRequestModel]:
        if not order_ids:
            return {}
        rows = await self._session.execute(select(RefundRequestModel).where(RefundRequestModel.order_id.in_(order_ids)))
        return {row.order_id: row for row in rows.scalars()}

    async def get(self, user_id: UUID, order_id: UUID) -> OrderView | None:
        row = (
            await self._session.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == user_id))
        ).scalar_one_or_none()
        if row is None:
            return None
        items = await self._items_of([row.id])
        refunds = await self._refunds_of([row.id])
        return _to_view(row, items[row.id], refunds.get(row.id))

    async def list_for_user(
        self, user_id: UUID, page: int, size: int, refunds_only: bool = False
    ) -> tuple[list[OrderView], int]:
        condition = [OrderModel.user_id == user_id]
        if refunds_only:
            # 환불을 신청했거나 취소된 주문만(예전 Supabase 주문 화면의 "취소·환불 내역"과 같은 기준)
            condition.append(
                or_(OrderModel.status == "cancelled", OrderModel.id.in_(select(RefundRequestModel.order_id)))
            )
        total = (await self._session.execute(select(func.count()).select_from(OrderModel).where(*condition))).scalar_one()
        rows = (
            (
                await self._session.execute(
                    select(OrderModel)
                    .where(*condition)
                    .order_by(OrderModel.created_at.desc(), OrderModel.id)
                    .offset((page - 1) * size)
                    .limit(size)
                )
            )
            .scalars()
            .all()
        )
        ids = [row.id for row in rows]
        items = await self._items_of(ids)
        refunds = await self._refunds_of(ids)
        return [_to_view(row, items[row.id], refunds.get(row.id)) for row in rows], total

    async def add_refund(self, order_id: UUID, reason: str) -> RefundView | None:
        # 주문당 신청 1건: 이미 있으면 충돌로 아무것도 저장하지 않고 None. 동시에 두 번 눌러도 한 건만 생긴다.
        statement = (
            pg_insert(RefundRequestModel)
            .values(order_id=order_id, reason=reason)
            .on_conflict_do_nothing(index_elements=[RefundRequestModel.order_id])
            .returning(RefundRequestModel)
        )
        row = (await self._session.execute(statement)).scalar_one_or_none()
        return _to_refund(row)
