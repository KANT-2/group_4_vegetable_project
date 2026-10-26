"""응용 계층이 인프라에 요구하는 인터페이스. 구현은 infrastructure/purchases 에 있다."""

from typing import Protocol
from uuid import UUID

from app.application.purchases.read_models import CartLine
from app.domain.purchases.cart import CartItem, ProductInfo


class CartRepository(Protocol):
    async def get_product(self, product_id: str) -> ProductInfo | None: ...

    async def list_lines(self, user_id: UUID) -> list[CartLine]: ...

    async def get_item(self, user_id: UUID, product_id: str, for_update: bool = False) -> CartItem | None: ...

    async def add_item(self, item: CartItem) -> None:
        """없으면 새로 만들고, 동시에 같은 상품을 담아 이미 있으면 수량을 더한다."""

    async def update_item(self, item: CartItem) -> None: ...

    async def delete_item(self, user_id: UUID, product_id: str) -> bool: ...


class PurchaseUnitOfWork(Protocol):
    """한 요청의 트랜잭션 경계. 서비스가 commit/rollback 을 결정한다."""

    cart: CartRepository

    async def commit(self) -> None: ...

    async def rollback(self) -> None: ...
