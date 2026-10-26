"""화면 표시용 조회 모델. 업무 규칙이 없는 읽기 전용 값이라 도메인이 아닌 응용 계층에 둔다."""

from dataclasses import dataclass

from app.domain.purchases.cart import CartItem, ProductInfo


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
        """판매 중인 상품만 합산한다. 판매가 끝난 줄은 보여 주되 금액에서 뺀다."""
        return sum(line.line_total for line in self.lines if line.product.is_active)
