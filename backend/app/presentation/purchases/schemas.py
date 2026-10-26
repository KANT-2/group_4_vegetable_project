"""장바구니 요청·응답 스키마 (Pydantic). 요청에 user_id 같은 다른 필드가 있으면 거부한다."""

from pydantic import BaseModel, ConfigDict, Field

from app.application.purchases.read_models import CartLine, CartView
from app.domain.purchases.cart import MAX_QUANTITY


class CartItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str = Field(min_length=1, max_length=100, description="상품 ID (문자열)")
    quantity: int = Field(ge=1, le=MAX_QUANTITY, strict=True, description=f"담을 수량 (1~{MAX_QUANTITY})")


class CartItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    quantity: int = Field(ge=1, le=MAX_QUANTITY, strict=True, description=f"바꿀 수량 (1~{MAX_QUANTITY})")


class CartLineOut(BaseModel):
    product_id: str
    name: str
    unit: str
    unit_price: int
    quantity: int
    line_total: int
    is_active: bool
    image_path: str | None

    @classmethod
    def from_line(cls, line: CartLine) -> "CartLineOut":
        return cls(
            product_id=line.item.product_id,
            name=line.product.name,
            unit=line.product.unit,
            unit_price=line.product.price,
            quantity=line.item.quantity,
            line_total=line.line_total,
            is_active=line.product.is_active,
            image_path=line.product.image_path,
        )


class CartOut(BaseModel):
    """장바구니는 한 사람 몫이라 페이지 없이 전체를 준다. subtotal_amount 는 판매 중인 상품만 합산한다."""

    items: list[CartLineOut]
    subtotal_amount: int

    @classmethod
    def from_view(cls, view: CartView) -> "CartOut":
        return cls(items=[CartLineOut.from_line(line) for line in view.lines], subtotal_amount=view.subtotal_amount)


class CartMergeLine(BaseModel):
    model_config = ConfigDict(extra="forbid")

    product_id: str = Field(min_length=1, max_length=100)
    quantity: int = Field(ge=1, le=MAX_QUANTITY, strict=True)


class CartMergeIn(BaseModel):
    """비회원 장바구니 전체. 비회원 장바구니는 최대 50종류라 요청도 50줄로 제한한다."""

    model_config = ConfigDict(extra="forbid")

    items: list[CartMergeLine] = Field(min_length=1, max_length=50)


class CartMergeOut(BaseModel):
    merged: int
    skipped_product_ids: list[str]
