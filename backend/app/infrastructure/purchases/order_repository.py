"""주문 Repository. ORM 모델 ↔ 도메인·읽기 모델 변환과 잠금 쿼리를 담당한다."""

from uuid import UUID

from sqlalchemy import delete, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.purchases.read_models import OrderItemView, OrderView, ShippingView
from app.domain.purchases.cart import ProductInfo
from app.domain.purchases.order import Order
from app.infrastructure.purchases.models import CartItemModel, OrderItemModel, OrderModel


def _to_view(order: OrderModel, items: list[OrderItemModel]) -> OrderView:
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
        # 장바구니 행은 쓰기 잠금, 상품 행은 공유 잠금: 주문하는 동안 수량·가격·판매 여부가 바뀌지 않는다.
        rows = await self._session.execute(
            text(
                "select c.quantity, p.id, p.name, p.unit, p.price, p.is_active, p.image_path "
                "from public.cart_items c join public.products p on p.id = c.product_id "
                "where c.user_id = :user_id order by c.product_id "
                "for update of c for share of p"
            ),
            {"user_id": user_id},
        )
        return [
            (
                ProductInfo(id=r.id, name=r.name, unit=r.unit, price=r.price, is_active=r.is_active, image_path=r.image_path),
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

    async def remove_cart_items(self, user_id: UUID, product_ids: list[str]) -> None:
        await self._session.execute(
            delete(CartItemModel).where(CartItemModel.user_id == user_id, CartItemModel.product_id.in_(product_ids))
        )

    async def get(self, user_id: UUID, order_id: UUID) -> OrderView | None:
        row = (
            await self._session.execute(select(OrderModel).where(OrderModel.id == order_id, OrderModel.user_id == user_id))
        ).scalar_one_or_none()
        if row is None:
            return None
        return _to_view(row, (await self._items_of([row.id]))[row.id])

    async def list_for_user(self, user_id: UUID, page: int, size: int) -> tuple[list[OrderView], int]:
        total = (
            await self._session.execute(select(func.count()).select_from(OrderModel).where(OrderModel.user_id == user_id))
        ).scalar_one()
        rows = (
            (
                await self._session.execute(
                    select(OrderModel)
                    .where(OrderModel.user_id == user_id)
                    .order_by(OrderModel.created_at.desc(), OrderModel.id)
                    .offset((page - 1) * size)
                    .limit(size)
                )
            )
            .scalars()
            .all()
        )
        items = await self._items_of([row.id for row in rows])
        return [_to_view(row, items[row.id]) for row in rows], total
