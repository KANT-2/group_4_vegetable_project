"""환불 신청(접수)과 엄격해진 배송지 검증 테스트. 메모리 저장소로 DB 없이 규칙·API 응답을 검증한다.

실제 DB 에서의 환불 저장은 tests/test_refund_db.py 에서 검증한다.
"""

from dataclasses import replace
from uuid import uuid4

import pytest

from app.application.purchases.cart_service import CartService
from app.application.purchases.errors import NotFound
from app.application.purchases.order_service import OrderService
from app.domain.purchases.order import (
    InvalidRefundReason,
    InvalidShipping,
    PaymentMethod,
    RefundNotAllowed,
    ShippingAddress,
    validate_refund_reason,
)
from tests.purchases_fakes import CARROT, USER_A, USER_B, FakeUnitOfWork
from tests.test_order_api import ORDERS, body, fill_cart, env  # noqa: F401  (env 는 pytest 픽스처)
from tests.test_cart_api import bearer

REASON = "맛이 없어서 환불하고 싶어요"


def shipping(**overrides):
    values = {
        "recipient_name": "홍길동",
        "recipient_phone": "01012345678",
        "postal_code": "06236",
        "address": "서울 강남구 테헤란로 1",
        "address_detail": "101동 202호",
    }
    return ShippingAddress(**{**values, **overrides})


# ---------- 배송지: 엉터리 우편번호·주소는 거부한다 ----------


@pytest.mark.parametrize("postal", ["11111", "22222", "00000", "99999", "00999", "64000"])
def test_implausible_postal_code_is_rejected(postal):
    with pytest.raises(InvalidShipping):
        shipping(postal_code=postal)


@pytest.mark.parametrize("postal", ["01000", "06236", "13529", "48058", "63999", "34126", "12345", "01234"])
def test_real_looking_postal_code_is_accepted(postal):
    assert shipping(postal_code=postal).postal_code == postal


@pytest.mark.parametrize("address", ["1111111111111111", "12345 67890", "!!!!!!!!", "aaaaaaaa", "ㅋㅋㅋㅋㅋㅋ", "서 1 1 1"])
def test_address_without_real_letters_is_rejected(address):
    with pytest.raises(InvalidShipping):
        shipping(address=address)


@pytest.mark.parametrize(
    "address", ["서울 강남구 테헤란로 1", "경기 성남시 분당구 판교역로 235", "부산 해운대구 해운대해변로 264", "123 Main Street Seoul"]
)
def test_real_looking_address_is_accepted(address):
    assert shipping(address=address).address == address


@pytest.mark.parametrize("detail", ["1111", "11 11", "ㅋㅋㅋㅋ", "aaaa", "!!!", "...."])
def test_implausible_detail_is_rejected(detail):
    with pytest.raises(InvalidShipping):
        shipping(address_detail=detail)


@pytest.mark.parametrize("detail", ["101동 202호", "202", "1호", "에이치스퀘어 N동 5층", "Apt 4B", "지하 1층"])
def test_real_looking_detail_is_accepted(detail):
    assert shipping(address_detail=detail).address_detail == detail


async def test_order_api_rejects_junk_address_with_422(env):  # noqa: F811
    h = await fill_cart(env)
    junk = body(shipping={**body()["shipping"], "postal_code": "11111", "address": "1111111111111111", "address_detail": "1111111"})
    r = await env.client.post(ORDERS, json=junk, headers=h)
    assert r.status_code == 422
    assert env.uow.orders_committed == {}  # 아무것도 저장하지 않는다
    assert env.uow.quantity(USER_A, CARROT.id) == 2  # 장바구니도 그대로


# ---------- 환불 사유 규칙 ----------


def test_refund_reason_is_trimmed_and_limited():
    assert validate_refund_reason("  " + REASON + "  ") == REASON
    for bad in ["", "짧아요", "가" * 9, "가" * 501, "         ", None, 123]:
        with pytest.raises(InvalidRefundReason):
            validate_refund_reason(bad)
    assert validate_refund_reason("가" * 10) == "가" * 10
    assert validate_refund_reason("가" * 500) == "가" * 500


# ---------- 환불 신청 응용 서비스 ----------


async def placed(uow, user=USER_A):
    cart, orders = CartService(uow), OrderService(uow)
    await cart.add_item(user, CARROT.id, 2)
    result = await orders.place_order(user, uuid4(), shipping(), PaymentMethod.CARD)
    return orders, result.order


async def test_refund_request_is_saved_for_my_paid_order():
    uow = FakeUnitOfWork()
    orders, order = await placed(uow)

    result = await orders.request_refund(USER_A, order.id, "  " + REASON + " ")

    assert result.created is True
    assert (result.refund.status, result.refund.reason) == ("requested", REASON)
    saved = uow.orders_committed[(USER_A, order.id)]
    assert saved.refund is not None and saved.refund.reason == REASON
    assert (await orders.get_order(USER_A, order.id)).refund.status == "requested"


async def test_requesting_again_returns_the_first_request_without_a_second_one():
    uow = FakeUnitOfWork()
    orders, order = await placed(uow)
    first = await orders.request_refund(USER_A, order.id, REASON)
    second = await orders.request_refund(USER_A, order.id, "다른 사유로 다시 신청해 봅니다 두번째")

    assert second.created is False
    assert second.refund.reason == first.refund.reason == REASON  # 처음 신청이 유지된다


async def test_other_users_order_is_not_found_and_nothing_is_saved():
    uow = FakeUnitOfWork()
    orders, order = await placed(uow, USER_A)
    with pytest.raises(NotFound):
        await orders.request_refund(USER_B, order.id, REASON)
    assert uow.orders_committed[(USER_A, order.id)].refund is None


async def test_unknown_order_is_not_found():
    uow = FakeUnitOfWork()
    with pytest.raises(NotFound):
        await OrderService(uow).request_refund(USER_A, uuid4(), REASON)


async def test_only_paid_orders_can_be_refunded():
    uow = FakeUnitOfWork()
    orders, order = await placed(uow)
    key = (USER_A, order.id)
    uow.orders_working[key] = uow.orders_committed[key] = replace(uow.orders_working[key], status="pending")

    with pytest.raises(RefundNotAllowed):
        await orders.request_refund(USER_A, order.id, REASON)
    assert uow.orders_committed[key].refund is None


async def test_invalid_reason_is_rejected_before_anything_is_saved():
    uow = FakeUnitOfWork()
    orders, order = await placed(uow)
    commits = uow.commits
    with pytest.raises(InvalidRefundReason):
        await orders.request_refund(USER_A, order.id, "짧아요")
    assert uow.commits == commits and uow.orders_committed[(USER_A, order.id)].refund is None


async def test_failure_while_saving_refund_rolls_back():
    uow = FakeUnitOfWork()
    orders, order = await placed(uow)
    uow.fail_on_commit = RuntimeError("저장 실패")
    with pytest.raises(RuntimeError):
        await orders.request_refund(USER_A, order.id, REASON)
    assert uow.orders_committed[(USER_A, order.id)].refund is None


async def test_refund_list_contains_only_refunded_orders():
    uow = FakeUnitOfWork()
    orders, first = await placed(uow)
    cart = CartService(uow)
    await cart.add_item(USER_A, CARROT.id, 1)
    second = (await orders.place_order(USER_A, uuid4(), shipping(), PaymentMethod.CARD)).order
    await orders.request_refund(USER_A, second.id, REASON)

    everything, total_all = await orders.list_orders(USER_A, 1, 20)
    refunded, total_refunded = await orders.list_orders(USER_A, 1, 20, refunds_only=True)

    assert total_all == 2 and total_refunded == 1
    assert [o.id for o in refunded] == [second.id] and first.id in [o.id for o in everything]


# ---------- 환불 신청 API ----------


async def make_order(env, user=USER_A):  # noqa: F811
    h = await fill_cart(env, user)
    r = await env.client.post(ORDERS, json=body(), headers=h)
    assert r.status_code == 201, r.text
    return h, r.json()["id"]


async def test_refund_api_creates_then_returns_existing(env):  # noqa: F811
    h, order_id = await make_order(env)
    url = f"{ORDERS}/{order_id}/refund"

    first = await env.client.post(url, json={"reason": REASON}, headers=h)
    assert first.status_code == 201
    assert first.json()["status"] == "requested" and first.json()["reason"] == REASON

    again = await env.client.post(url, json={"reason": "두 번째로 다른 사유를 적어서 다시 보냅니다"}, headers=h)
    assert again.status_code == 200
    assert again.json()["reason"] == REASON

    detail = (await env.client.get(f"{ORDERS}/{order_id}", headers=h)).json()
    assert detail["refund"]["status"] == "requested" and detail["refund"]["reason"] == REASON
    listed = (await env.client.get(ORDERS, params={"refunds_only": "true"}, headers=h)).json()
    assert [o["id"] for o in listed["items"]] == [order_id]


async def test_refund_api_validation_and_ownership(env):  # noqa: F811
    h, order_id = await make_order(env)
    url = f"{ORDERS}/{order_id}/refund"

    assert (await env.client.post(url, json={"reason": "짧아요"}, headers=h)).status_code == 422
    assert (await env.client.post(url, json={"reason": REASON, "user_id": str(USER_B)}, headers=h)).status_code == 422
    assert (await env.client.post(url, json={}, headers=h)).status_code == 422
    assert (await env.client.post(f"{ORDERS}/{uuid4()}/refund", json={"reason": REASON}, headers=h)).status_code == 404
    # 남의 주문은 없는 주문과 같은 404 다
    assert (await env.client.post(url, json={"reason": REASON}, headers=bearer(USER_B))).status_code == 404
    assert (await env.client.get(f"{ORDERS}/{order_id}", headers=h)).json()["refund"] is None  # 거부된 요청은 저장되지 않았다


async def test_refund_api_requires_login(env):  # noqa: F811
    _, order_id = await make_order(env)
    r = await env.client.post(f"{ORDERS}/{order_id}/refund", json={"reason": REASON})
    assert r.status_code == 401
