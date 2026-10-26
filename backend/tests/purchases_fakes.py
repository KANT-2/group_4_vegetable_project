"""구매(장바구니·주문) 테스트용 메모리 저장소. DB 없이 서비스·API 규칙을 검증하는 데 쓴다.

실제 DB 와 같은 트랜잭션 성질을 흉내 낸다: commit 전 변경은 rollback 하면 사라진다.
"""

from copy import deepcopy
from uuid import UUID

from app.application.purchases.read_models import CartLine
from app.domain.purchases.cart import CartItem, ProductInfo

USER_A = UUID("00000000-0000-4000-8000-00000000000a")
USER_B = UUID("00000000-0000-4000-8000-00000000000b")

CARROT = ProductInfo(id="carrot-bent-1kg", name="휜 당근 1kg", unit="1kg", price=3000, is_active=True)
ONION = ProductInfo(id="onion-small-2kg", name="작은 양파 2kg", unit="2kg", price=4500, is_active=True)
RETIRED = ProductInfo(id="old-potato-1kg", name="판매 끝난 감자", unit="1kg", price=2000, is_active=False)


class FakeCartRepository:
    def __init__(self, uow: "FakeUnitOfWork"):
        self._uow = uow

    @property
    def _items(self) -> dict[tuple[UUID, str], int]:
        return self._uow.working

    async def get_product(self, product_id: str) -> ProductInfo | None:
        return self._uow.products.get(product_id)

    async def list_lines(self, user_id: UUID) -> list[CartLine]:
        return [
            CartLine(item=CartItem(user_id=u, product_id=p, quantity=q), product=self._uow.products[p])
            for (u, p), q in self._items.items()
            if u == user_id
        ]

    async def get_item(self, user_id: UUID, product_id: str, for_update: bool = False) -> CartItem | None:
        quantity = self._items.get((user_id, product_id))
        return None if quantity is None else CartItem(user_id=user_id, product_id=product_id, quantity=quantity)

    async def add_item(self, item: CartItem) -> None:
        key = (item.user_id, item.product_id)
        self._items[key] = self._items.get(key, 0) + item.quantity

    async def update_item(self, item: CartItem) -> None:
        self._items[(item.user_id, item.product_id)] = item.quantity

    async def delete_item(self, user_id: UUID, product_id: str) -> bool:
        return self._items.pop((user_id, product_id), None) is not None


class FakeUnitOfWork:
    def __init__(self, products: list[ProductInfo] | None = None, fail_on_commit: Exception | None = None):
        self.products = {p.id: p for p in (products if products is not None else [CARROT, ONION, RETIRED])}
        self.committed: dict[tuple[UUID, str], int] = {}
        self.working: dict[tuple[UUID, str], int] = {}
        self.fail_on_commit = fail_on_commit
        self.commits = 0
        self.rollbacks = 0
        self.cart = FakeCartRepository(self)

    async def commit(self) -> None:
        if self.fail_on_commit is not None:
            raise self.fail_on_commit
        self.committed = deepcopy(self.working)
        self.commits += 1

    async def rollback(self) -> None:
        self.working = deepcopy(self.committed)
        self.rollbacks += 1

    def quantity(self, user_id: UUID, product_id: str) -> int | None:
        """저장이 끝난(commit 된) 수량."""
        return self.committed.get((user_id, product_id))
