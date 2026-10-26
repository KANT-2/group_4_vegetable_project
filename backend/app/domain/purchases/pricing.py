"""주문 금액 계산 도메인. 영우 담당. 순수 파이썬: 외부 프레임워크에 의존하지 않는다.

금액은 항상 서버가 DB 의 상품 가격으로 계산한다. 클라이언트가 보낸 금액은 계산에 쓰지 않는다.
정책은 팀 합의(2026-10-26): 상품 합계 2만원 이상 무료배송, 미만 3,500원. 쿠폰 할인은 이번 범위에서 제외한다.
"""

from collections.abc import Iterable
from dataclasses import dataclass

from app.domain.purchases.cart import validate_quantity

FREE_SHIPPING_THRESHOLD = 20_000  # 상품 판매가 × 수량 합계가 이 금액 이상이면 배송비 0원
SHIPPING_FEE = 3_500


@dataclass(frozen=True)
class OrderAmounts:
    items_total: int
    shipping_fee: int

    @property
    def total_amount(self) -> int:
        return self.items_total + self.shipping_fee


def shipping_fee_for(items_total: int) -> int:
    """상품 합계로 배송비를 정한다. 담긴 상품이 없으면(합계 0) 배송비도 없다."""
    if items_total < 0:
        raise ValueError("상품 합계는 0 이상이어야 합니다.")
    if items_total == 0 or items_total >= FREE_SHIPPING_THRESHOLD:
        return 0
    return SHIPPING_FEE


def calculate_amounts(lines: Iterable[tuple[int, int]]) -> OrderAmounts:
    """(단가, 수량) 목록으로 상품 합계·배송비를 계산한다. 판매 중인 상품의 줄만 넘겨야 한다."""
    items_total = 0
    for unit_price, quantity in lines:
        if isinstance(unit_price, bool) or not isinstance(unit_price, int) or unit_price <= 0:
            raise ValueError("단가는 1원 이상의 정수여야 합니다.")
        validate_quantity(quantity)
        items_total += unit_price * quantity
    return OrderAmounts(items_total=items_total, shipping_fee=shipping_fee_for(items_total))

