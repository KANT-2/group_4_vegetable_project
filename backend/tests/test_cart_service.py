"""장바구니 응용 서비스 테스트. 메모리 저장소로 DB 없이 규칙·트랜잭션·사용자 분리를 검증한다."""

import pytest

from app.application.purchases.cart_service import CartService
from app.application.purchases.errors import NotFound
from app.domain.purchases.cart import MAX_QUANTITY, InvalidQuantity, ProductNotPurchasable
from tests.purchases_fakes import CARROT, ONION, RETIRED, USER_A, USER_B, FakeUnitOfWork


@pytest.fixture
def uow():
    return FakeUnitOfWork()


@pytest.fixture
def service(uow):
    return CartService(uow)


async def test_add_new_item(service, uow):
    line = await service.add_item(USER_A, CARROT.id, 2)
    assert (line.item.quantity, line.line_total) == (2, 6000)
    assert uow.quantity(USER_A, CARROT.id) == 2


async def test_adding_same_product_merges_quantity(service, uow):
    await service.add_item(USER_A, CARROT.id, 2)
    line = await service.add_item(USER_A, CARROT.id, 3)
    assert line.item.quantity == 5
    assert uow.quantity(USER_A, CARROT.id) == 5


async def test_adding_over_limit_is_rejected_and_keeps_previous_quantity(service, uow):
    await service.add_item(USER_A, CARROT.id, MAX_QUANTITY)
    with pytest.raises(InvalidQuantity):
        await service.add_item(USER_A, CARROT.id, 1)
    assert uow.quantity(USER_A, CARROT.id) == MAX_QUANTITY


@pytest.mark.parametrize("quantity", [0, -3, MAX_QUANTITY + 1])
async def test_invalid_quantity_is_rejected_and_nothing_is_saved(service, uow, quantity):
    with pytest.raises(InvalidQuantity):
        await service.add_item(USER_A, CARROT.id, quantity)
    assert uow.committed == {}


async def test_unknown_product_is_not_found(service, uow):
    with pytest.raises(NotFound):
        await service.add_item(USER_A, "no-such-product", 1)
    assert uow.committed == {}


async def test_inactive_product_cannot_be_added(service, uow):
    with pytest.raises(ProductNotPurchasable):
        await service.add_item(USER_A, RETIRED.id, 1)
    assert uow.committed == {}


async def test_change_quantity(service, uow):
    await service.add_item(USER_A, CARROT.id, 2)
    line = await service.change_quantity(USER_A, CARROT.id, 9)
    assert (line.item.quantity, line.line_total) == (9, 27000)
    assert uow.quantity(USER_A, CARROT.id) == 9


async def test_change_quantity_validates_and_keeps_previous_value(service, uow):
    await service.add_item(USER_A, CARROT.id, 2)
    with pytest.raises(InvalidQuantity):
        await service.change_quantity(USER_A, CARROT.id, 0)
    assert uow.quantity(USER_A, CARROT.id) == 2


async def test_change_quantity_of_missing_item_is_not_found(service):
    with pytest.raises(NotFound):
        await service.change_quantity(USER_A, CARROT.id, 3)


async def test_remove_item(service, uow):
    await service.add_item(USER_A, CARROT.id, 2)
    await service.remove_item(USER_A, CARROT.id)
    assert uow.quantity(USER_A, CARROT.id) is None
    with pytest.raises(NotFound):
        await service.remove_item(USER_A, CARROT.id)


async def test_carts_are_separated_by_user(service, uow):
    await service.add_item(USER_A, CARROT.id, 2)
    await service.add_item(USER_B, ONION.id, 1)

    assert [line.item.product_id for line in (await service.get_cart(USER_A)).lines] == [CARROT.id]
    assert [line.item.product_id for line in (await service.get_cart(USER_B)).lines] == [ONION.id]

    # B 가 A 의 항목을 바꾸거나 지우려 해도 B 의 장바구니에는 없으므로 찾을 수 없고, A 의 것은 그대로다.
    with pytest.raises(NotFound):
        await service.change_quantity(USER_B, CARROT.id, 50)
    with pytest.raises(NotFound):
        await service.remove_item(USER_B, CARROT.id)
    assert uow.quantity(USER_A, CARROT.id) == 2


async def test_cart_subtotal_excludes_inactive_products(uow, service):
    await service.add_item(USER_A, CARROT.id, 2)  # 6,000
    await service.add_item(USER_A, ONION.id, 1)  # 4,500
    # 담은 뒤 상품이 판매 종료된 상황
    uow.products[ONION.id] = ONION.__class__(**{**ONION.__dict__, "is_active": False})
    view = await service.get_cart(USER_A)
    assert len(view.lines) == 2  # 줄은 보여 주되
    assert view.subtotal_amount == 6000  # 금액에서는 뺀다


async def test_inactive_item_already_in_cart_can_still_be_removed_but_not_increased(uow, service):
    await service.add_item(USER_A, ONION.id, 1)
    uow.products[ONION.id] = ONION.__class__(**{**ONION.__dict__, "is_active": False})
    with pytest.raises(ProductNotPurchasable):
        await service.change_quantity(USER_A, ONION.id, 5)
    await service.remove_item(USER_A, ONION.id)
    assert uow.quantity(USER_A, ONION.id) is None


async def test_failure_while_saving_rolls_back(service):
    uow = FakeUnitOfWork(fail_on_commit=RuntimeError("저장 실패"))
    failing = CartService(uow)
    with pytest.raises(RuntimeError):
        await failing.add_item(USER_A, CARROT.id, 2)
    assert uow.rollbacks == 1
    assert uow.working == {} and uow.committed == {}  # 일부만 저장되지 않는다
