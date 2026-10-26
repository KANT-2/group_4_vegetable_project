"""주문 금액·배송비 계산 테스트. DB·서버 없이 순수 파이썬으로 검증한다."""

import pytest

from app.domain.purchases.cart import MAX_QUANTITY, InvalidQuantity
from app.domain.purchases.pricing import (
    FREE_SHIPPING_THRESHOLD,
    SHIPPING_FEE,
    calculate_amounts,
    shipping_fee_for,
)


def test_policy_values_match_team_agreement():
    assert FREE_SHIPPING_THRESHOLD == 20_000
    assert SHIPPING_FEE == 3_500


@pytest.mark.parametrize(
    ("items_total", "fee"),
    [(0, 0), (1, 3_500), (19_999, 3_500), (20_000, 0), (20_001, 0), (1_000_000, 0)],
)
def test_shipping_fee_boundaries(items_total, fee):
    assert shipping_fee_for(items_total) == fee


def test_negative_total_is_rejected():
    with pytest.raises(ValueError):
        shipping_fee_for(-1)


def test_amounts_below_free_shipping_add_fee():
    amounts = calculate_amounts([(2_900, 2), (12_900, 1)])  # 5,800 + 12,900 = 18,700
    assert (amounts.items_total, amounts.shipping_fee, amounts.total_amount) == (18_700, 3_500, 22_200)


def test_amounts_at_threshold_are_free():
    amounts = calculate_amounts([(10_000, 2)])
    assert (amounts.items_total, amounts.shipping_fee, amounts.total_amount) == (20_000, 0, 20_000)


def test_threshold_uses_item_total_not_total_with_fee():
    # 합계 19,999원이면 배송비 3,500원이 붙어 총액은 23,499원이어도 무료배송이 되지 않는다.
    amounts = calculate_amounts([(19_999, 1)])
    assert (amounts.shipping_fee, amounts.total_amount) == (3_500, 23_499)


def test_empty_lines_have_no_amount_and_no_fee():
    amounts = calculate_amounts([])
    assert (amounts.items_total, amounts.shipping_fee, amounts.total_amount) == (0, 0, 0)


def test_max_quantity_line():
    amounts = calculate_amounts([(1_000, MAX_QUANTITY)])
    assert amounts.items_total == 99_000 and amounts.shipping_fee == 0


@pytest.mark.parametrize("quantity", [0, -1, MAX_QUANTITY + 1, True, 1.5, "2", None])
def test_invalid_quantity_is_rejected(quantity):
    with pytest.raises(InvalidQuantity):
        calculate_amounts([(1_000, quantity)])


@pytest.mark.parametrize("price", [0, -500, True, 1.5, "1000", None])
def test_invalid_price_is_rejected(price):
    with pytest.raises(ValueError):
        calculate_amounts([(price, 1)])
