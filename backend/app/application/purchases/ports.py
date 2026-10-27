"""응용 계층이 인프라에 요구하는 인터페이스. 구현은 infrastructure/purchases 에 있다."""

from typing import Protocol
from uuid import UUID

from app.application.purchases.read_models import CartLine, OrderView, RefundView
from app.domain.purchases.cart import CartItem, ProductInfo
from app.domain.purchases.order import Order


class CartRepository(Protocol):
    async def get_product(self, product_id: str) -> ProductInfo | None: ...

    async def list_lines(self, user_id: UUID) -> list[CartLine]: ...

    async def get_item(self, user_id: UUID, product_id: str, for_update: bool = False) -> CartItem | None: ...

    async def add_item(self, item: CartItem) -> None:
        """없으면 새로 만들고, 동시에 같은 상품을 담아 이미 있으면 수량을 더한다."""

    async def upsert_at_least(self, item: CartItem) -> None:
        """없으면 새로 만들고, 있으면 기존 수량과 item.quantity 중 큰 값으로 맞춘다. 반복·동시에 실행해도 결과가 같다."""

    async def update_item(self, item: CartItem) -> None: ...

    async def delete_item(self, user_id: UUID, product_id: str) -> bool: ...


class OrderRepository(Protocol):
    async def lock_user(self, user_id: UUID) -> None:
        """같은 사용자의 주문 요청을 한 줄로 세운다(트랜잭션이 끝나면 풀린다). 같은 request_key 의 중복 생성을 막는 데 쓴다."""

    async def get_by_request_key(self, user_id: UUID, request_key: UUID) -> OrderView | None: ...

    async def checkout_lines(self, user_id: UUID) -> list[tuple[ProductInfo, int]]:
        """주문할 장바구니 줄(상품 정보, 수량)을 잠그고 읽는다. 주문하는 동안 장바구니·상품(재고)이 바뀌지 않게 쓰기 잠금을 건다."""

    async def add(self, order: Order) -> None: ...

    async def decrease_stock(self, lines: list[tuple[str, int]]) -> None:
        """(상품 ID, 수량)만큼 재고를 줄인다. checkout_lines 가 잡은 잠금 안에서 부른다. 모자라면 InsufficientStock."""

    async def remove_cart_items(self, user_id: UUID, product_ids: list[str]) -> None:
        """주문한 상품만 장바구니에서 지운다."""

    async def get(self, user_id: UUID, order_id: UUID) -> OrderView | None:
        """본인 주문만 돌려준다. 남의 주문이거나 없으면 None."""

    async def list_for_user(
        self, user_id: UUID, page: int, size: int, refunds_only: bool = False
    ) -> tuple[list[OrderView], int]:
        """내 주문 목록(최신순). refunds_only 면 환불을 신청했거나 취소된 주문만 돌려준다."""

    async def add_refund(self, order_id: UUID, reason: str) -> RefundView | None:
        """환불 신청을 저장한다. 이미 신청한 주문이면 저장하지 않고 None 을 돌려준다(주문당 신청 1건)."""


class PurchaseUnitOfWork(Protocol):
    """한 요청의 트랜잭션 경계. 서비스가 commit/rollback 을 결정한다."""

    cart: CartRepository
    orders: OrderRepository

    async def commit(self) -> None: ...

    async def rollback(self) -> None: ...
