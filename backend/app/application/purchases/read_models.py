"""화면 표시용 조회 모델. 업무 규칙이 없는 읽기 전용 값이라 도메인이 아닌 응용 계층에 둔다."""

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from app.domain.purchases.cart import CartItem, ProductInfo
from app.domain.purchases.order import Order


@dataclass(frozen=True)
class CartLine:
    """장바구니 한 줄 = 담은 수량 + 지금 상품 정보(이름·단가·판매 여부)."""

    item: CartItem
    product: ProductInfo

    @property
    def line_total(self) -> int:
        return self.product.price * self.item.quantity


@dataclass(frozen=True)
class CartView:
    lines: list[CartLine]

    @property
    def subtotal_amount(self) -> int:
        """판매 중이고 품절이 아닌 상품만 합산한다. 판매가 끝났거나 품절된 줄은 보여 주되 금액에서 뺀다."""
        return sum(line.line_total for line in self.lines if line.product.is_purchasable)


@dataclass(frozen=True)
class ShippingView:
    """주문에 복사 저장된 배송지(읽기용). 예전 방식으로 저장된 주문은 상세주소가 비어 있을 수 있어 검증하지 않는다."""

    recipient_name: str
    recipient_phone: str
    postal_code: str
    address: str
    address_detail: str | None


@dataclass(frozen=True)
class OrderItemView:
    product_id: str
    product_name: str
    product_unit: str
    unit_price: int
    quantity: int

    @property
    def line_total(self) -> int:
        return self.unit_price * self.quantity


@dataclass(frozen=True)
class OrderView:
    id: UUID
    status: str
    payment_method: str | None
    shipping: ShippingView
    items: tuple[OrderItemView, ...]
    items_total: int
    shipping_fee: int
    paid_at: datetime | None
    created_at: datetime

    @property
    def total_amount(self) -> int:
        return self.items_total + self.shipping_fee

    @classmethod
    def from_order(cls, order: Order) -> "OrderView":
        return cls(
            id=order.id,
            status=order.status.value,
            payment_method=order.payment_method.value,
            shipping=ShippingView(
                recipient_name=order.shipping.recipient_name,
                recipient_phone=order.shipping.recipient_phone,
                postal_code=order.shipping.postal_code,
                address=order.shipping.address,
                address_detail=order.shipping.address_detail,
            ),
            items=tuple(
                OrderItemView(i.product_id, i.product_name, i.product_unit, i.unit_price, i.quantity) for i in order.items
            ),
            items_total=order.items_total,
            shipping_fee=order.shipping_fee,
            paid_at=order.paid_at,
            created_at=order.created_at,
        )


@dataclass(frozen=True)
class PlacedOrder:
    """주문 결과. created=False 는 같은 request_key 의 재요청이라 기존 주문을 그대로 돌려준 경우다."""

    order: OrderView
    created: bool


@dataclass(frozen=True)
class MergeResult:
    """비회원 장바구니 합치기 결과. skipped 는 판매가 끝났거나 없는 상품이라 합치지 못한 상품 ID 다."""

    merged: int
    skipped: list[str]
