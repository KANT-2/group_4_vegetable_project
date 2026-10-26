"""장바구니 도메인 규칙 테스트. DB·서버 없이 순수 파이썬으로 검증한다."""

from uuid import uuid4

import pytest

from app.domain.purchases.cart import (
    MAX_QUANTITY,
    CartItem,
    InvalidQuantity,
    ProductInfo,
    ProductNotPurchasable,
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
