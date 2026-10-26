"""주문 요청·응답 스키마 (Pydantic). 요청에 user_id·금액 같은 정해지지 않은 필드가 있으면 거부한다."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.application.purchases.read_models import OrderItemView, OrderView
from app.domain.purchases.order import PaymentMethod, ShippingAddress


class ShippingIn(BaseModel):
    """배송지 입력. 길이·형식 규칙은 도메인(ShippingAddress)이 검증한다. 여기서는 터무니없이 긴 입력만 막는다."""

    model_config = ConfigDict(extra="forbid")

    recipient_name: str = Field(max_length=200)
    recipient_phone: str = Field(max_length=50)
    postal_code: str = Field(max_length=20)
    address: str = Field(max_length=500)
    address_detail: str = Field(max_length=500)

    def to_domain(self) -> ShippingAddress:
        return ShippingAddress(**self.model_dump())


class OrderCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    request_key: UUID = Field(description="주문 요청마다 새로 만든 UUID. 같은 값으로 다시 요청하면 기존 주문을 돌려준다.")
    shipping: ShippingIn
    payment_method: PaymentMethod
    expected_total_amount: int | None = Field(
        default=None,
        ge=1,
        strict=True,
        description="화면에 보인 총 결제 금액. 서버 계산과 다르면 거부한다. 이 값이 저장·적용되지는 않는다.",
    )


class ShippingOut(BaseModel):
    recipient_name: str
    recipient_phone: str
    postal_code: str
    address: str
    address_detail: str | None


class OrderItemOut(BaseModel):
    product_id: str
    product_name: str
    product_unit: str
    unit_price: int
    quantity: int
    line_total: int

    @classmethod
    def from_view(cls, item: OrderItemView) -> "OrderItemOut":
        return cls(
            product_id=item.product_id,
            product_name=item.product_name,
            product_unit=item.product_unit,
            unit_price=item.unit_price,
            quantity=item.quantity,
            line_total=item.line_total,
        )


class OrderOut(BaseModel):
    id: UUID
    status: str
    payment_method: str | None
    shipping: ShippingOut
    items: list[OrderItemOut]
    items_total: int
    shipping_fee: int
    total_amount: int
    paid_at: datetime | None
    created_at: datetime

    @classmethod
    def from_view(cls, order: OrderView) -> "OrderOut":
        return cls(
            id=order.id,
            status=order.status,
            payment_method=order.payment_method,
            shipping=ShippingOut(
                recipient_name=order.shipping.recipient_name,
                recipient_phone=order.shipping.recipient_phone,
                postal_code=order.shipping.postal_code,
                address=order.shipping.address,
                address_detail=order.shipping.address_detail,
            ),
            items=[OrderItemOut.from_view(item) for item in order.items],
            items_total=order.items_total,
            shipping_fee=order.shipping_fee,
            total_amount=order.total_amount,
            paid_at=order.paid_at,
            created_at=order.created_at,
        )


class OrderList(BaseModel):
    items: list[OrderOut]
    total: int
    page: int
    size: int
