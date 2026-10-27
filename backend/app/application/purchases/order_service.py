"""주문 응용 서비스. 모의 결제 주문을 만들고 조회한다. 업무 규칙 판단은 도메인(Order.place)에 맡긴다.

한 요청 안에서 사용자 잠금 → 중복 요청 확인 → 장바구니 잠금·읽기 → 주문 생성 → 저장 → 재고 차감 → 주문한 상품만 장바구니에서 삭제 →
커밋을 한 트랜잭션으로 처리한다. 중간에 하나라도 실패하면 전부 롤백되어 주문만 생기거나 장바구니만 비워지지 않는다.
사용자는 인증된 user_id 인자로만 정한다. 남의 주문은 조회할 수 없다.
"""

from collections.abc import Callable
from datetime import datetime, timezone
from uuid import UUID

from app.application.purchases.errors import NotFound
from app.application.purchases.ports import PurchaseUnitOfWork
from app.application.purchases.read_models import OrderView, PlacedOrder, RefundResult
from app.domain.purchases.order import (
    Order,
    OrderStatus,
    PaymentMethod,
    RefundNotAllowed,
    ShippingAddress,
    validate_refund_reason,
)


class OrderService:
    def __init__(self, uow: PurchaseUnitOfWork, clock: Callable[[], datetime] | None = None):
        self._uow = uow
        self._now = clock or (lambda: datetime.now(timezone.utc))

    async def place_order(
        self,
        user_id: UUID,
        request_key: UUID,
        shipping: ShippingAddress,
        payment_method: PaymentMethod,
        expected_total_amount: int | None = None,
    ) -> PlacedOrder:
        repo = self._uow.orders
        try:
            await repo.lock_user(user_id)
            # 같은 요청(request_key)이 다시 오면 새로 만들지 않고 처음 만든 주문을 돌려준다.
            existing = await repo.get_by_request_key(user_id, request_key)
            if existing is not None:
                await self._uow.commit()  # 잠금만 풀면 되므로 변경 없이 끝낸다
                return PlacedOrder(order=existing, created=False)

            lines = await repo.checkout_lines(user_id)
            order = Order.place(
                user_id=user_id,
                request_key=request_key,
                shipping=shipping,
                payment_method=payment_method,
                lines=lines,
                now=self._now(),
                expected_total_amount=expected_total_amount,
            )
            await repo.add(order)
            await repo.decrease_stock([(item.product_id, item.quantity) for item in order.items])
            await repo.remove_cart_items(user_id, [item.product_id for item in order.items])
            await self._uow.commit()
            return PlacedOrder(order=OrderView.from_order(order), created=True)
        except Exception:
            await self._uow.rollback()
            raise

    async def get_order(self, user_id: UUID, order_id: UUID) -> OrderView:
        order = await self._uow.orders.get(user_id, order_id)
        if order is None:
            raise NotFound("주문을 찾을 수 없습니다.")  # 남의 주문도 같은 응답이라 존재 여부를 알 수 없다
        return order

    async def list_orders(
        self, user_id: UUID, page: int, size: int, refunds_only: bool = False
    ) -> tuple[list[OrderView], int]:
        return await self._uow.orders.list_for_user(user_id, page, size, refunds_only)

    async def request_refund(self, user_id: UUID, order_id: UUID, reason: str) -> RefundResult:
        """내 결제 완료 주문의 환불 신청을 접수한다. 주문당 1건이라 다시 신청하면 처음 신청을 그대로 돌려준다.

        접수만 한다: 승인·반려, 실제 환불, 재고 복원은 하지 않는다(범위 밖).
        """
        reason = validate_refund_reason(reason)
        repo = self._uow.orders
        try:
            await repo.lock_user(user_id)  # 같은 사용자의 요청을 한 줄로 세워 중복 신청 경쟁을 없앤다
            order = await repo.get(user_id, order_id)
            if order is None:
                raise NotFound("주문을 찾을 수 없습니다.")  # 남의 주문도 같은 응답
            if order.refund is not None:
                await self._uow.commit()
                return RefundResult(refund=order.refund, created=False)
            if order.status != OrderStatus.PAID.value:
                raise RefundNotAllowed("결제 완료 주문만 환불을 신청할 수 있어요.")
            created = await repo.add_refund(order_id, reason)
            if created is None:  # 방금 다른 요청이 먼저 저장한 경우
                existing = await repo.get(user_id, order_id)
                await self._uow.commit()
                return RefundResult(refund=existing.refund, created=False)
            await self._uow.commit()
            return RefundResult(refund=created, created=True)
        except Exception:
            await self._uow.rollback()
            raise
