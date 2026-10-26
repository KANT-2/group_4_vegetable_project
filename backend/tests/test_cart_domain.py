"""장바구니 도메인 규칙 테스트. DB·서버 없이 순수 파이썬으로 검증한다."""

from uuid import uuid4

import pytest

from app.domain.purchases.cart import (
    MAX_QUANTITY,
    CartItem,
    InvalidQuantity,
    ProductInfo,
    ProductNotPurchasable,
    merged_quantity,
    validate_quantity,
)


@pytest.mark.parametrize("quantity", [1, 2, MAX_QUANTITY])
def test_valid_quantity(quantity):
    assert validate_quantity(quantity) == quantity


@pytest.mark.parametrize("quantity", [0, -1, MAX_QUANTITY + 1, 1000, True, False, 1.5, "3", None])
def test_invalid_quantity_is_rejected(quantity):
    with pytest.raises(InvalidQuantity):
        validate_quantity(quantity)


def test_item_cannot_be_created_with_invalid_quantity():
    with pytest.raises(InvalidQuantity):
        CartItem(user_id=uuid4(), product_id="carrot-bent-1kg", quantity=0)


def test_add_merges_quantities():
    item = CartItem(user_id=uuid4(), product_id="carrot-bent-1kg", quantity=2)
    item.add(3)
    assert item.quantity == 5


def test_add_over_limit_is_rejected_not_clamped():
    item = CartItem(user_id=uuid4(), product_id="carrot-bent-1kg", quantity=MAX_QUANTITY - 1)
    with pytest.raises(InvalidQuantity):
        item.add(2)
    assert item.quantity == MAX_QUANTITY - 1  # 거부되면 수량은 그대로


def test_add_up_to_limit_is_allowed():
    item = CartItem(user_id=uuid4(), product_id="carrot-bent-1kg", quantity=MAX_QUANTITY - 1)
    item.add(1)
    assert item.quantity == MAX_QUANTITY


def test_change_sets_quantity_and_validates():
    item = CartItem(user_id=uuid4(), product_id="carrot-bent-1kg", quantity=2)
    item.change(7)
    assert item.quantity == 7
    with pytest.raises(InvalidQuantity):
        item.change(0)
    assert item.quantity == 7


def test_inactive_product_is_not_purchasable():
    retired = ProductInfo(id="x", name="x", unit="1kg", price=1000, is_active=False)
    with pytest.raises(ProductNotPurchasable):
        retired.ensure_purchasable()
    ProductInfo(id="y", name="y", unit="1kg", price=1000, is_active=True).ensure_purchasable()


@pytest.mark.parametrize(
    ("existing", "incoming", "expected"),
    [(None, 2, 2), (3, 2, 3), (2, 3, 3), (5, 5, 5), (99, 1, 99), (1, 99, 99)],
)
def test_merged_quantity_keeps_the_larger_value(existing, incoming, expected):
    assert merged_quantity(existing, incoming) == expected


def test_merged_quantity_is_idempotent():
    # 같은 비회원 수량을 몇 번 합쳐도 결과가 변하지 않는다(응답 유실 후 재시도·두 탭 동시 요청 대비)
    quantity = merged_quantity(3, 2)
    for _ in range(5):
        quantity = merged_quantity(quantity, 2)
    assert quantity == 3


@pytest.mark.parametrize("incoming", [0, -1, MAX_QUANTITY + 1, True, 1.5, None])
def test_merged_quantity_rejects_invalid_incoming(incoming):
    with pytest.raises(InvalidQuantity):
        merged_quantity(2, incoming)
