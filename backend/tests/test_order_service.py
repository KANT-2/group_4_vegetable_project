"""주문 응용 서비스 테스트. 메모리 저장소로 DB 없이 트랜잭션·중복 방지·사용자 분리를 검증한다."""

from dataclasses import replace
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.application.purchases.cart_service import CartService
from app.application.purchases.errors import NotFound
from app.application.purchases.order_service import OrderService
from app.domain.purchases.cart import ProductNotPurchasable
from app.domain.purchases.order import CartChanged, EmptyCart, PaymentMethod, ShippingAddress
from tests.purchases_fakes import CARROT, ONION, RETIRED, USER_A, USER_B, FakeUnitOfWork

NOW = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)
SHIPPING = ShippingAddress("홍길동", "01012345678", "06236", "서울 강남구 테헤란로 1", "101동 202호")


def make(uow: FakeUnitOfWork | None = None):
    uow = uow or FakeUnitOfWork()
    return uow, CartService(uow), OrderService(uow, clock=lambda: NOW)


async def place(orders: OrderService, user=USER_A, key=None, expected=None, method=PaymentMethod.CARD):
    return await orders.place_order(user, key or uuid4(), SHIPPING, method, expected)


async def test_place_order_saves_order_and_clears_cart():
    uow, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 2)  # 6,000
    await cart.add_item(USER_A, ONION.id, 1)  # 4,500 → 합계 10,500 + 배송비 3,500
    placed = await place(orders)

    assert placed.created is True
    order = placed.order
    assert (order.status, order.payment_method) == ("paid", "card")
    assert (order.items_total, order.shipping_fee, order.total_amount) == (10_500, 3_500, 14_000)
    assert [(i.product_id, i.quantity) for i in order.items] == [(CARROT.id, 2), (ONION.id, 1)]
    assert uow.orders_committed[(USER_A, order.id)] == order  # 저장됨
    assert uow.committed == {}  # 주문한 상품은 장바구니에서 빠짐
    assert uow.locks == 1


async def test_free_shipping_order():
    uow, cart, orders = make()
    await cart.add_item(USER_A, ONION.id, 5)  # 22,500
    order = (await place(orders)).order
    assert (order.items_total, order.shipping_fee, order.total_amount) == (22_500, 0, 22_500)


async def test_same_request_key_returns_existing_order_without_creating_another():
    uow, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 2)
    key = uuid4()
    first = await place(orders, key=key)
    await cart.add_item(USER_A, ONION.id, 1)  # 첫 주문 뒤에 새로 담은 상품

    again = await place(orders, key=key)
    assert again.created is False
    assert again.order.id == first.order.id
    assert len(uow.orders_committed) == 1
    assert uow.quantity(USER_A, ONION.id) == 1  # 재요청이 새 장바구니를 건드리지 않는다


async def test_other_users_can_reuse_the_same_request_key():
    uow, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)
    await cart.add_item(USER_B, CARROT.id, 1)
    key = uuid4()
    a = await place(orders, USER_A, key)
    b = await place(orders, USER_B, key)
    assert b.created is True and a.order.id != b.order.id


async def test_empty_cart_is_rejected_and_nothing_is_saved():
    uow, _, orders = make()
    with pytest.raises(EmptyCart):
        await place(orders)
    assert uow.orders_committed == {} and uow.rollbacks == 1


async def test_ordering_twice_with_new_key_after_cart_was_cleared_is_rejected():
    _, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)
    await place(orders)
    with pytest.raises(EmptyCart):
        await place(orders)  # 새 request_key 로 다시 눌러도 빈 장바구니라 두 번째 주문은 생기지 않는다


async def test_inactive_product_in_cart_rejects_order():
    uow, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)
    await cart.add_item(USER_A, ONION.id, 1)
    uow.products[ONION.id] = replace(ONION, is_active=False)  # 담은 뒤 판매 종료
    with pytest.raises(ProductNotPurchasable):
        await place(orders)
    assert uow.orders_committed == {}
    assert uow.quantity(USER_A, CARROT.id) == 1 and uow.quantity(USER_A, ONION.id) == 1  # 장바구니는 그대로


async def test_unknown_inactive_only_cart_cannot_be_ordered():
    uow = FakeUnitOfWork(products=[CARROT, RETIRED])
    uow.working[(USER_A, RETIRED.id)] = 1
    uow.committed = dict(uow.working)
    _, _, orders = make(uow)
    with pytest.raises(ProductNotPurchasable):
        await place(orders)


@pytest.mark.parametrize("claimed", [1, 5_000, 6_499, 6_501, 999_999])
async def test_wrong_expected_total_rejects_order_and_keeps_cart(claimed):
    uow, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)  # 3,000 + 3,500 = 6,500
    with pytest.raises(CartChanged):
        await place(orders, expected=claimed)
    assert uow.orders_committed == {} and uow.quantity(USER_A, CARROT.id) == 1


async def test_correct_expected_total_is_accepted():
    _, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)
    assert (await place(orders, expected=6_500)).order.total_amount == 6_500


async def test_price_change_after_viewing_is_detected():
    uow, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)
    shown = 6_500  # 화면에 보인 금액
    uow.products[CARROT.id] = replace(CARROT, price=9_000)  # 그 사이 가격이 오름
    with pytest.raises(CartChanged):
        await place(orders, expected=shown)


async def test_failure_after_order_is_added_rolls_everything_back():
    uow = FakeUnitOfWork(fail_on_remove_cart=RuntimeError("장바구니 정리 실패"))
    _, cart, orders = make(uow)
    await cart.add_item(USER_A, CARROT.id, 2)
    with pytest.raises(RuntimeError):
        await place(orders)
    assert uow.orders_committed == {} and uow.orders_working == {}  # 주문만 생기지 않는다
    assert uow.quantity(USER_A, CARROT.id) == 2  # 장바구니는 그대로
    assert uow.working == uow.committed


async def test_failure_while_adding_order_keeps_cart():
    uow = FakeUnitOfWork(fail_on_add_order=RuntimeError("주문 저장 실패"))
    _, cart, orders = make(uow)
    await cart.add_item(USER_A, CARROT.id, 2)
    with pytest.raises(RuntimeError):
        await place(orders)
    assert uow.orders_committed == {} and uow.quantity(USER_A, CARROT.id) == 2


async def test_failure_on_commit_saves_nothing():
    uow = FakeUnitOfWork()
    _, cart, orders = make(uow)
    await cart.add_item(USER_A, CARROT.id, 2)
    uow.fail_on_commit = RuntimeError("커밋 실패")
    with pytest.raises(RuntimeError):
        await place(orders)
    assert uow.orders_committed == {} and uow.quantity(USER_A, CARROT.id) == 2


async def test_order_snapshot_does_not_change_when_product_changes():
    uow, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)
    order = (await place(orders)).order
    uow.products[CARROT.id] = replace(CARROT, name="이름이 바뀐 당근", price=9_999)
    seen = await orders.get_order(USER_A, order.id)
    assert (seen.items[0].product_name, seen.items[0].unit_price) == (CARROT.name, CARROT.price)


async def test_other_user_cannot_read_an_order():
    _, cart, orders = make()
    await cart.add_item(USER_A, CARROT.id, 1)
    order = (await place(orders)).order
    with pytest.raises(NotFound):
        await orders.get_order(USER_B, order.id)
    with pytest.raises(NotFound):
        await orders.get_order(USER_A, uuid4())
    assert (await orders.get_order(USER_A, order.id)).id == order.id


async def test_list_orders_shows_only_own_orders_newest_first_with_paging():
    uow, cart, _ = make()
    ids = []
    for minute in range(3):
        orders = OrderService(uow, clock=lambda m=minute: NOW.replace(minute=m))
        await cart.add_item(USER_A, CARROT.id, 1)
        ids.append((await place(orders)).order.id)
    await cart.add_item(USER_B, CARROT.id, 1)
    await place(OrderService(uow, clock=lambda: NOW), USER_B)

    service = OrderService(uow)
    page1, total = await service.list_orders(USER_A, 1, 2)
    page2, _ = await service.list_orders(USER_A, 2, 2)
    assert total == 3
    assert [o.id for o in page1] == [ids[2], ids[1]] and [o.id for o in page2] == [ids[0]]
    assert (await service.list_orders(USER_B, 1, 20))[1] == 1
