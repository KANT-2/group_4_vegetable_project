"""주문 응용 서비스. 모의 결제 주문을 만들고 조회한다. 업무 규칙 판단은 도메인(Order.place)에 맡긴다.

한 요청 안에서 사용자 잠금 → 중복 요청 확인 → 장바구니 잠금·읽기 → 주문 생성 → 저장 → 주문한 상품만 장바구니에서 삭제 →
커밋을 한 트랜잭션으로 처리한다. 중간에 하나라도 실패하면 전부 롤백되어 주문만 생기거나 장바구니만 비워지지 않는다.
사용자는 인증된 user_id 인자로만 정한다. 남의 주문은 조회할 수 없다.
"""

from collections.abc import Callable
from datetime import datetime, timezone
from uuid import UUID

from app.application.purchases.errors import NotFound
from app.application.purchases.ports import PurchaseUnitOfWork
from app.application.purchases.read_models import OrderView, PlacedOrder
from app.domain.purchases.order import Order, PaymentMethod, ShippingAddress


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

    async def list_orders(self, user_id: UUID, page: int, size: int) -> tuple[list[OrderView], int]:
        return await self._uow.orders.list_for_user(user_id, page, size)
