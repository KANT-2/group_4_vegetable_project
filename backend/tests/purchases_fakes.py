"""구매(장바구니·주문) 테스트용 메모리 저장소. DB 없이 서비스·API 규칙을 검증하는 데 쓴다.

실제 DB 와 같은 트랜잭션 성질을 흉내 낸다: commit 전 변경은 rollback 하면 사라진다.
"""

from copy import deepcopy
from dataclasses import replace
from datetime import datetime, timezone
from uuid import UUID

from app.application.purchases.read_models import CartLine, OrderView, RefundView
from app.domain.purchases.cart import CartItem, InsufficientStock, ProductInfo
from app.domain.purchases.order import Order

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

    async def upsert_at_least(self, item: CartItem) -> None:
        key = (item.user_id, item.product_id)
        self._items[key] = max(self._items.get(key, 0), item.quantity)

    async def update_item(self, item: CartItem) -> None:
        self._items[(item.user_id, item.product_id)] = item.quantity

    async def delete_item(self, user_id: UUID, product_id: str) -> bool:
        return self._items.pop((user_id, product_id), None) is not None


class FakeOrderRepository:
    """메모리 주문 저장소. 장바구니는 FakeUnitOfWork.working 을 같이 쓰므로 주문과 장바구니 정리가 한 트랜잭션처럼 움직인다."""

    def __init__(self, uow: "FakeUnitOfWork"):
        self._uow = uow

    async def lock_user(self, user_id: UUID) -> None:
        self._uow.locks += 1

    async def get_by_request_key(self, user_id: UUID, request_key: UUID) -> OrderView | None:
        for (owner, _), view in self._uow.orders_working.items():
            if owner == user_id and self._uow.request_keys.get(view.id) == (user_id, request_key):
                return view
        return None

    async def checkout_lines(self, user_id: UUID) -> list[tuple[ProductInfo, int]]:
        return [
            (self._uow.products[product_id], quantity)
            for (owner, product_id), quantity in sorted(self._uow.working.items(), key=lambda kv: kv[0][1])
            if owner == user_id
        ]

    async def add(self, order: Order) -> None:
        if self._uow.fail_on_add_order is not None:
            raise self._uow.fail_on_add_order
        self._uow.orders_working[(order.user_id, order.id)] = OrderView.from_order(order)
        self._uow.request_keys[order.id] = (order.user_id, order.request_key)

    async def decrease_stock(self, lines: list[tuple[str, int]]) -> None:
        for product_id, quantity in lines:
            product = self._uow.products[product_id]
            if product.stock is not None:
                if product.stock < quantity:
                    raise InsufficientStock(product.name, product.stock)
                self._uow.products[product_id] = replace(product, stock=product.stock - quantity)

    async def remove_cart_items(self, user_id: UUID, product_ids: list[str]) -> None:
        if self._uow.fail_on_remove_cart is not None:
            raise self._uow.fail_on_remove_cart
        for product_id in product_ids:
            self._uow.working.pop((user_id, product_id), None)

    async def get(self, user_id: UUID, order_id: UUID) -> OrderView | None:
        return self._uow.orders_working.get((user_id, order_id))

    async def list_for_user(
        self, user_id: UUID, page: int, size: int, refunds_only: bool = False
    ) -> tuple[list[OrderView], int]:
        mine = sorted(
            (
                v
                for (owner, _), v in self._uow.orders_working.items()
                if owner == user_id and (not refunds_only or v.refund is not None or v.status == "cancelled")
            ),
            key=lambda v: v.created_at,
            reverse=True,
        )
        return mine[(page - 1) * size : page * size], len(mine)

    async def add_refund(self, order_id: UUID, reason: str) -> RefundView | None:
        for key, view in self._uow.orders_working.items():
            if view.id == order_id:
                if view.refund is not None:
                    return None
                refund = RefundView(
                    status="requested", reason=reason, created_at=datetime.now(timezone.utc), reviewed_at=None
                )
                self._uow.orders_working[key] = replace(view, refund=refund)
                return refund
        return None


class FakeUnitOfWork:
    def __init__(
        self,
        products: list[ProductInfo] | None = None,
        fail_on_commit: Exception | None = None,
        fail_on_add_order: Exception | None = None,
        fail_on_remove_cart: Exception | None = None,
    ):
        self.products = {p.id: p for p in (products if products is not None else [CARROT, ONION, RETIRED])}
        self.products_committed = dict(self.products)  # 재고 차감도 commit 전에는 rollback 으로 되돌아간다
        self.committed: dict[tuple[UUID, str], int] = {}
        self.working: dict[tuple[UUID, str], int] = {}
        self.fail_on_commit = fail_on_commit
        self.fail_on_add_order = fail_on_add_order
        self.fail_on_remove_cart = fail_on_remove_cart
        self.orders_committed: dict[tuple[UUID, UUID], OrderView] = {}
        self.orders_working: dict[tuple[UUID, UUID], OrderView] = {}
        self.request_keys: dict[UUID, tuple[UUID, UUID]] = {}
        self.locks = 0
        self.commits = 0
        self.rollbacks = 0
        self.cart = FakeCartRepository(self)
        self.orders = FakeOrderRepository(self)

    async def commit(self) -> None:
        if self.fail_on_commit is not None:
            raise self.fail_on_commit
        self.committed = deepcopy(self.working)
        self.orders_committed = dict(self.orders_working)
        self.products_committed = dict(self.products)
        self.commits += 1

    async def rollback(self) -> None:
        self.working = deepcopy(self.committed)
        self.orders_working = dict(self.orders_committed)
        self.products = dict(self.products_committed)
        self.request_keys = {oid: key for oid, key in self.request_keys.items() if (key[0], oid) in self.orders_committed}
        self.rollbacks += 1

    def quantity(self, user_id: UUID, product_id: str) -> int | None:
        """저장이 끝난(commit 된) 수량."""
        return self.committed.get((user_id, product_id))
