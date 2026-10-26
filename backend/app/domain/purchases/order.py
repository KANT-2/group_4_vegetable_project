"""주문 도메인. 영우 담당. 순수 파이썬: FastAPI·SQLAlchemy 등 외부 프레임워크에 의존하지 않는다.

기존 Supabase 함수 mock_checkout 의 업무 규칙을 옮긴 것이다. 모의 결제만 다루며 실제 결제 승인으로 기록하지 않는다.
- 금액은 항상 서버가 넘겨받은 상품 정보(DB 값)로 계산한다. 클라이언트가 본 금액(expected_total_amount)은
  "화면에 보인 금액과 같은지" 확인하는 용도로만 쓰고, 다르면 주문을 거부한다. 클라이언트 금액이 저장되는 일은 없다.
- 주문 당시 상품 이름·단위·단가와 배송지는 복사해 저장한다(이후 상품·프로필이 바뀌어도 주문은 그대로다).
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from uuid import UUID, uuid4

from app.domain.purchases.cart import ProductInfo, PurchaseDomainError, validate_quantity
from app.domain.purchases.pricing import calculate_amounts

_PHONE = re.compile(r"0[0-9]{8,10}")  # [0-9] 로 제한해 전각 숫자 같은 다른 숫자 문자를 막는다
_POSTAL_CODE = re.compile(r"[0-9]{5}")


class OrderDomainError(PurchaseDomainError):
    """주문 업무 규칙 위반의 공통 부모."""


class InvalidShipping(OrderDomainError, ValueError):
    pass


class EmptyCart(OrderDomainError):
    pass


class CartChanged(OrderDomainError):
    """화면에서 본 금액과 지금 서버가 계산한 금액이 다르다(가격·장바구니가 바뀜)."""


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    PAYMENT_FAILED = "payment_failed"
    CANCELLED = "cancelled"


class PaymentMethod(StrEnum):
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    EASY_PAY = "easy_pay"


def _text(value: object, field: str) -> str:
    if not isinstance(value, str):
        raise InvalidShipping(f"{field}을(를) 입력해 주세요.")
    return value.strip()


@dataclass(frozen=True)
class ShippingAddress:
    """주문 당시 배송지. 만들 때 공백을 정리하고 검증한다."""

    recipient_name: str
    recipient_phone: str
    postal_code: str
    address: str
    address_detail: str

    def __post_init__(self) -> None:
        name = _text(self.recipient_name, "받는 분 이름")
        # 전화번호·우편번호는 DB 와 같게 앞뒤 공백을 정리하지 않고 형식만 확인한다.
        phone, postal = self.recipient_phone, self.postal_code
        address = _text(self.address, "주소")
        detail = _text(self.address_detail, "상세주소")
        if not 2 <= len(name) <= 40:
            raise InvalidShipping("받는 분 이름은 2~40자여야 합니다.")
        if not isinstance(phone, str) or not _PHONE.fullmatch(phone):
            raise InvalidShipping("전화번호는 0으로 시작하는 숫자 9~11자리여야 합니다.")
        if not isinstance(postal, str) or not _POSTAL_CODE.fullmatch(postal):
            raise InvalidShipping("우편번호는 숫자 5자리여야 합니다.")
        if not 5 <= len(address) <= 200:
            raise InvalidShipping("주소는 5~200자여야 합니다.")
        if not 1 <= len(detail) <= 100:
            raise InvalidShipping("상세주소는 1~100자로 입력해 주세요.")
        object.__setattr__(self, "recipient_name", name)
        object.__setattr__(self, "address", address)
        object.__setattr__(self, "address_detail", detail)


@dataclass(frozen=True)
class OrderItem:
    """주문 당시 상품 정보의 복사본."""

    product_id: str
    product_name: str
    product_unit: str
    unit_price: int
    quantity: int

    def __post_init__(self) -> None:
        validate_quantity(self.quantity)
        if isinstance(self.unit_price, bool) or not isinstance(self.unit_price, int) or self.unit_price <= 0:
            raise ValueError("단가는 1원 이상의 정수여야 합니다.")

    @property
    def line_total(self) -> int:
        return self.unit_price * self.quantity


@dataclass(frozen=True)
class Order:
    id: UUID
    user_id: UUID
    request_key: UUID
    status: OrderStatus
    shipping: ShippingAddress
    payment_method: PaymentMethod
    items: tuple[OrderItem, ...]
    items_total: int
    shipping_fee: int
    paid_at: datetime | None
    created_at: datetime

    def __post_init__(self) -> None:
        if not self.items:
            raise EmptyCart("주문할 상품이 없습니다.")
        if (self.status is OrderStatus.PAID) != (self.paid_at is not None):
            raise ValueError("결제 완료 주문만 결제 시각을 가져야 합니다.")

    @property
    def total_amount(self) -> int:
        return self.items_total + self.shipping_fee

    @classmethod
    def place(
        cls,
        *,
        user_id: UUID,
        request_key: UUID,
        shipping: ShippingAddress,
        payment_method: PaymentMethod,
        lines: Sequence[tuple[ProductInfo, int]],
        now: datetime,
        expected_total_amount: int | None = None,
        order_id: UUID | None = None,
    ) -> "Order":
        """장바구니 줄(상품 정보, 수량)로 모의 결제가 끝난 주문을 만든다. 저장은 응용 서비스가 한다."""
        if not lines:
            raise EmptyCart("장바구니가 비어 있습니다.")
        for product, quantity in lines:
            product.ensure_stock(quantity)  # 판매 중·품절 아님·수량 ≤ 재고
        # 줄 순서를 상품 ID 순으로 고정해 같은 장바구니는 항상 같은 주문 내용이 되게 한다.
        ordered = sorted(lines, key=lambda line: line[0].id)
        amounts = calculate_amounts([(product.price, quantity) for product, quantity in ordered])
        if expected_total_amount is not None and expected_total_amount != amounts.total_amount:
            raise CartChanged("상품 가격이나 장바구니가 변경됐어요. 장바구니에서 다시 확인해 주세요.")
        return cls(
            id=order_id or uuid4(),
            user_id=user_id,
            request_key=request_key,
            status=OrderStatus.PAID,  # 모의 결제는 항상 성공으로 처리한다(실제 결제 승인이 아니다)
            shipping=shipping,
            payment_method=payment_method,
            items=tuple(
                OrderItem(
                    product_id=product.id,
                    product_name=product.name,
                    product_unit=product.unit,
                    unit_price=product.price,
                    quantity=quantity,
                )
                for product, quantity in ordered
            ),
            items_total=amounts.items_total,
            shipping_fee=amounts.shipping_fee,
            paid_at=now,
            created_at=now,
        )

