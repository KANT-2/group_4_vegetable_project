import pytest
from app.domain.catalog.models import Product, InvalidProductChange


@pytest.mark.parametrize("price", [0, -1, 2147483648, 1.5, True, "1000"])
def test_invalid_prices_do_not_change_product(price):
    product = Product("carrot", 1000, 2000, True)
    with pytest.raises(InvalidProductChange):
        product.revise(price=price)
    assert product.price == 1000


def test_price_above_original_is_rejected():
    with pytest.raises(InvalidProductChange):
        Product("carrot", 1000, 2000, True).revise(price=2001)


def test_price_and_sale_state_can_change_independently():
    product = Product("carrot", 1000, 2000, True)
    product.revise(price=2000)
    assert product.is_active
    product.revise(is_active=False)
    assert product.price == 2000 and not product.is_active
    product.revise(is_active=True)
    assert product.is_active
