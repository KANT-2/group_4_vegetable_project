"""재고 규칙 테스트. 메모리 저장소로 DB 없이 담기·수량 변경·주문 시 재고 확인과 차감을 검증한다."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.application.purchases.cart_service import CartService
from app.application.purchases.order_service import OrderService
from app.domain.catalog.models import InvalidProductChange, Product
from app.domain.purchases.cart import InsufficientStock, ProductInfo
from app.domain.purchases.order import PaymentMethod, ShippingAddress
from tests.purchases_fakes import USER_A, USER_B, FakeUnitOfWork

NOW = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)
SHIPPING = ShippingAddress("홍길동", "01012345678", "06236", "서울 강남구 테헤란로 1", "101동 202호")
LIMITED = ProductInfo(id="carrot-bent-1kg", name="휜 당근 1kg", unit="1kg", price=3000, is_active=True, stock=2)
SOLD_OUT = ProductInfo(id="onion-small-2kg", name="작은 양파 2kg", unit="2kg", price=4500, is_active=True, stock=0)


def make(*products: ProductInfo):
    uow = FakeUnitOfWork(list(products or (LIMITED, SOLD_OUT)))
    return uow, CartService(uow), OrderService(uow, clock=lambda: NOW)


async def place(orders: OrderService, user=USER_A):
    return await orders.place_order(user, uuid4(), SHIPPING, PaymentMethod.CARD)


async def test_adding_more_than_stock_is_rejected_with_available_quantity():
    uow, cart, _ = make()
    with pytest.raises(InsufficientStock) as error:
        await cart.add_item(USER_A, LIMITED.id, 3)
    assert error.value.available == 2
    assert "2개까지만" in str(error.value)
    assert uow.quantity(USER_A, LIMITED.id) is None


async def test_adding_again_counts_quantity_already_in_cart():
    uow, cart, _ = make()
    await cart.add_item(USER_A, LIMITED.id, 2)
    with pytest.raises(InsufficientStock):
        await cart.add_item(USER_A, LIMITED.id, 1)
    assert uow.quantity(USER_A, LIMITED.id) == 2


async def test_changing_quantity_over_stock_is_rejected():
    uow, cart, _ = make()
    await cart.add_item(USER_A, LIMITED.id, 1)
    with pytest.raises(InsufficientStock):
        await cart.change_quantity(USER_A, LIMITED.id, 3)
    assert uow.quantity(USER_A, LIMITED.id) == 1


async def test_sold_out_product_cannot_be_added_and_is_excluded_from_subtotal():
    uow, cart, _ = make()
    with pytest.raises(InsufficientStock) as error:
        await cart.add_item(USER_A, SOLD_OUT.id, 1)
    assert error.value.available == 0 and "품절" in str(error.value)
    await cart.add_item(USER_A, LIMITED.id, 1)
    uow.working[(USER_A, SOLD_OUT.id)] = 1  # 담은 뒤 품절된 상황
    assert (await cart.get_cart(USER_A)).subtotal_amount == 3000


async def test_merge_skips_sold_out_and_caps_quantity_at_stock():
    uow, cart, _ = make()
    result = await cart.merge_items(USER_A, [(LIMITED.id, 5), (SOLD_OUT.id, 1)])
    assert result.skipped == [SOLD_OUT.id]
    assert uow.quantity(USER_A, LIMITED.id) == 2


async def test_order_decreases_stock_and_last_unit_cannot_be_sold_twice():
    uow, cart, orders = make()
    await cart.add_item(USER_A, LIMITED.id, 2)
    await cart.add_item(USER_B, LIMITED.id, 1)  # 담는 것만으로는 재고를 잡아 두지 않는다
    await place(orders, USER_A)
    assert uow.products_committed[LIMITED.id].stock == 0
    with pytest.raises(InsufficientStock):
        await place(orders, USER_B)  # 먼저 결제한 사람이 가져간 뒤에는 품절
    assert uow.quantity(USER_B, LIMITED.id) == 1  # 실패한 주문은 장바구니를 지우지 않는다


async def test_failed_order_does_not_decrease_stock():
    uow, cart, orders = make()
    await cart.add_item(USER_A, LIMITED.id, 1)
    uow.fail_on_remove_cart = RuntimeError("장바구니 정리 실패")
    with pytest.raises(RuntimeError):
        await place(orders)
    assert uow.products[LIMITED.id].stock == 2


async def test_order_is_rejected_when_stock_dropped_below_cart_quantity():
    uow, cart, orders = make()
    await cart.add_item(USER_A, LIMITED.id, 2)
    uow.products[LIMITED.id] = uow.products_committed[LIMITED.id] = ProductInfo(
        id=LIMITED.id, name=LIMITED.name, unit="1kg", price=3000, is_active=True, stock=1
    )
    with pytest.raises(InsufficientStock) as error:
        await place(orders)
    assert error.value.available == 1


def test_admin_can_set_stock_but_not_negative():
    product = Product("carrot-bent-1kg", 3000, 4000, True, 20)
    product.revise(stock=0)
    assert product.stock == 0
    for bad in (-1, 1.5, True, 1_000_001):
        with pytest.raises(InvalidProductChange):
            product.revise(stock=bad)
