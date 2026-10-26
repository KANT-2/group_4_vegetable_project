"""주문 도메인 규칙 테스트. DB·서버 없이 순수 파이썬으로 검증한다."""

from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.domain.purchases.cart import MAX_QUANTITY, InvalidQuantity, ProductInfo, ProductNotPurchasable
from app.domain.purchases.order import (
    CartChanged,
    EmptyCart,
    InvalidShipping,
    Order,
    OrderStatus,
    PaymentMethod,
    ShippingAddress,
)

NOW = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)
CARROT = ProductInfo(id="carrot-bent-1kg", name="해남 흙당근 1kg", unit="1kg", price=2_900, is_active=True)
APPLE = ProductInfo(id="apple-scratched-2kg", name="청송 꿀사과 가정용 2kg", unit="2kg", price=12_900, is_active=True)
RETIRED = ProductInfo(id="old-potato-1kg", name="판매 끝난 감자", unit="1kg", price=2_000, is_active=False)


def shipping(**overrides):
    values = {
        "recipient_name": "홍길동",
        "recipient_phone": "01012345678",
        "postal_code": "06236",
        "address": "서울 강남구 테헤란로 1",
        "address_detail": "101동 202호",
    }
    return ShippingAddress(**{**values, **overrides})


def place(lines, **overrides):
    values = {
        "user_id": uuid4(),
        "request_key": uuid4(),
        "shipping": shipping(),
        "payment_method": PaymentMethod.CARD,
        "lines": lines,
        "now": NOW,
    }
    return Order.place(**{**values, **overrides})


# ---------- 배송지 ----------


def test_valid_shipping_is_trimmed():
    s = shipping(recipient_name="  홍길동 ", address="  서울 강남구 테헤란로 1  ", address_detail="  202호 ")
    assert (s.recipient_name, s.address, s.address_detail) == ("홍길동", "서울 강남구 테헤란로 1", "202호")


@pytest.mark.parametrize("name", ["김", " 김 ", "", "   ", "가" * 41])
def test_invalid_recipient_name(name):
    with pytest.raises(InvalidShipping):
        shipping(recipient_name=name)


@pytest.mark.parametrize("name", ["김철", "가" * 40])
def test_recipient_name_boundaries_are_allowed(name):
    assert shipping(recipient_name=name).recipient_name == name


@pytest.mark.parametrize("phone", ["010-1234-5678", "1012345678", "0101234", "010123456789", " 01012345678", "０１０１２３４５６７８", "010１２３４５６７８", "0１0１2345678", "abc", ""])
def test_invalid_phone(phone):
    with pytest.raises(InvalidShipping):
        shipping(recipient_phone=phone)


@pytest.mark.parametrize("phone", ["021234567", "0212345678", "01012345678"])  # 9, 10, 11자리
def test_valid_phone_lengths(phone):
    assert shipping(recipient_phone=phone).recipient_phone == phone


@pytest.mark.parametrize("postal", ["0623", "062361", "0623a", "０６２３６", "0６２３６", " 06236", ""])
def test_invalid_postal_code(postal):
    with pytest.raises(InvalidShipping):
        shipping(postal_code=postal)


@pytest.mark.parametrize("address", ["서울시", "가" * 201, "      "])
def test_invalid_address(address):
    with pytest.raises(InvalidShipping):
        shipping(address=address)


@pytest.mark.parametrize("detail", ["", "   ", "가" * 101])
def test_address_detail_is_required_and_limited(detail):
    with pytest.raises(InvalidShipping):
        shipping(address_detail=detail)


@pytest.mark.parametrize("field", ["recipient_name", "recipient_phone", "postal_code", "address", "address_detail"])
@pytest.mark.parametrize("value", [None, 123, ["x"]])
def test_non_string_shipping_values_are_rejected(field, value):
    with pytest.raises(InvalidShipping):
        shipping(**{field: value})


# ---------- 주문 만들기 ----------


def test_place_order_snapshots_items_and_calculates_amounts():
    order = place([(CARROT, 2), (APPLE, 1)])  # 5,800 + 12,900 = 18,700 → 배송비 3,500
    assert order.status is OrderStatus.PAID and order.paid_at == NOW and order.created_at == NOW
    assert (order.items_total, order.shipping_fee, order.total_amount) == (18_700, 3_500, 22_200)
    assert [(i.product_id, i.product_name, i.product_unit, i.unit_price, i.quantity) for i in order.items] == [
        (APPLE.id, APPLE.name, "2kg", 12_900, 1),
        (CARROT.id, CARROT.name, "1kg", 2_900, 2),
    ]  # 상품 ID 순서로 고정


def test_free_shipping_at_threshold():
    order = place([(ProductInfo(id="x-1", name="x", unit="1개", price=10_000, is_active=True), 2)])
    assert (order.items_total, order.shipping_fee, order.total_amount) == (20_000, 0, 20_000)


def test_order_snapshot_does_not_follow_later_product_changes():
    order = place([(CARROT, 1)])
    changed = ProductInfo(id=CARROT.id, name="이름이 바뀐 당근", unit="2kg", price=9_900, is_active=True)
    assert changed.price != order.items[0].unit_price  # 주문에는 주문 당시 값이 남는다
    assert (order.items[0].product_name, order.items[0].unit_price) == (CARROT.name, 2_900)


def test_same_cart_gives_same_item_order_regardless_of_input_order():
    first = place([(CARROT, 1), (APPLE, 1)])
    second = place([(APPLE, 1), (CARROT, 1)])
    assert first.items == second.items


def test_empty_cart_is_rejected():
    with pytest.raises(EmptyCart):
        place([])


def test_inactive_product_is_rejected():
    with pytest.raises(ProductNotPurchasable):
        place([(CARROT, 1), (RETIRED, 1)])


@pytest.mark.parametrize("quantity", [0, -1, MAX_QUANTITY + 1])
def test_invalid_quantity_is_rejected(quantity):
    with pytest.raises(InvalidQuantity):
        place([(CARROT, quantity)])


def test_max_quantity_is_allowed():
    order = place([(CARROT, MAX_QUANTITY)])
    assert order.items_total == 2_900 * MAX_QUANTITY and order.shipping_fee == 0


# ---------- 클라이언트 금액은 믿지 않는다 ----------


def test_expected_total_matching_server_amount_is_accepted():
    assert place([(CARROT, 2), (APPLE, 1)], expected_total_amount=22_200).total_amount == 22_200


@pytest.mark.parametrize("claimed", [0, 1, 18_700, 22_199, 22_201, 1_000_000])
def test_tampered_or_stale_total_is_rejected_not_applied(claimed):
    with pytest.raises(CartChanged):
        place([(CARROT, 2), (APPLE, 1)], expected_total_amount=claimed)


def test_without_expected_total_server_amount_is_used():
    assert place([(CARROT, 1)]).total_amount == 2_900 + 3_500


# ---------- 결제 수단 ----------


@pytest.mark.parametrize("method", ["card", "bank_transfer", "easy_pay"])
def test_payment_methods(method):
    assert PaymentMethod(method).value == method


def test_unknown_payment_method_is_not_allowed():
    with pytest.raises(ValueError):
        PaymentMethod("cash")
