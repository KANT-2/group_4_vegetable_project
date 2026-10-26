"""장바구니 도메인. 영우 담당. 순수 파이썬: FastAPI·SQLAlchemy 등 외부 프레임워크에 의존하지 않는다."""

from dataclasses import dataclass
from uuid import UUID

MAX_QUANTITY = 99  # 기존 DB 제약(cart_items.quantity 1~99)과 같은 시작값 (팀 확인 필요)


class PurchaseDomainError(Exception):
    """장바구니·주문 업무 규칙 위반의 공통 부모."""


class InvalidQuantity(PurchaseDomainError, ValueError):
    pass


class ProductNotPurchasable(PurchaseDomainError):
    pass


class InsufficientStock(PurchaseDomainError):
    """원하는 수량이 남은 재고보다 많다. available 은 지금 살 수 있는 최대 수량이다."""

    def __init__(self, product_name: str, available: int, in_cart: int = 0):
        self.available = available
        message = (
            f"'{product_name}' 재고가 {available}개 남아 {available}개까지만 구매할 수 있어요."
            if available > 0
            else f"'{product_name}'은(는) 품절됐어요."
        )
        if available > 0 and in_cart:
            message += f" (장바구니에 이미 {in_cart}개가 담겨 있어요.)"
        super().__init__(message)


def validate_quantity(quantity: int) -> int:
    # bool 은 int 의 하위 타입이라 True 가 수량 1 로 통과하지 않게 막는다.
    if isinstance(quantity, bool) or not isinstance(quantity, int) or not 1 <= quantity <= MAX_QUANTITY:
        raise InvalidQuantity(f"수량은 1~{MAX_QUANTITY}개여야 합니다.")
    return quantity


@dataclass(frozen=True)
class ProductInfo:
    """장바구니가 필요로 하는 상품 정보. 상품 가격·판매 상태의 원본은 서현 님 담당 데이터다."""

    id: str
    name: str
    unit: str
    price: int
    is_active: bool
    image_path: str | None = None
    stock: int | None = None  # 남은 재고. None 은 재고를 관리하지 않는 상품(테스트·예전 데이터)

    @property
    def is_purchasable(self) -> bool:
        """판매 중이고 품절이 아니다."""
        return self.is_active and self.stock != 0

    def ensure_purchasable(self) -> None:
        if not self.is_active:
            raise ProductNotPurchasable("판매가 끝난 상품은 담을 수 없습니다.")
        if self.stock == 0:
            raise InsufficientStock(self.name, 0)

    def ensure_stock(self, quantity: int, in_cart: int = 0) -> None:
        """이 상품을 quantity 개(장바구니에 이미 담긴 in_cart 개 포함) 살 수 있는지 확인한다. 재고에 맞춰 자르지 않고 거부한다."""
        self.ensure_purchasable()
        if self.stock is not None and quantity > self.stock:
            raise InsufficientStock(self.name, self.stock, in_cart)


@dataclass
class CartItem:
    user_id: UUID
    product_id: str
    quantity: int

    def __post_init__(self) -> None:
        validate_quantity(self.quantity)

    def add(self, quantity: int) -> None:
        """같은 상품을 다시 담으면 수량을 더한다. 상한을 넘으면 자르지 않고 거부한다."""
        validate_quantity(quantity)
        validate_quantity(self.quantity + quantity)
        self.quantity += quantity

    def change(self, quantity: int) -> None:
        self.quantity = validate_quantity(quantity)


def merged_quantity(existing: int | None, incoming: int) -> int:
    """비회원 장바구니를 합칠 때의 수량: 이미 담긴 수량과 비회원으로 담아 둔 수량 중 큰 값.

    더하지 않는 이유: 같은 요청이 네트워크 문제로 다시 오거나 두 탭에서 동시에 오더라도 결과가 같아야(멱등) 하기 때문이다.
    더하는 방식이면 서버는 반영했는데 응답만 실패한 경우 재시도에서 수량이 두 번 더해진다.
    """
    validate_quantity(incoming)
    return incoming if existing is None else max(validate_quantity(existing), incoming)
