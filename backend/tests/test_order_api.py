"""주문 API 테스트. 실제 라우터·요청 검증·오류 변환을 거치되 저장소만 메모리로 바꿔 DB 없이 실행한다.

인증은 test_cart_api.py 와 같은 방식이다: 토큰 검사(401)는 지나 님 실제 인증으로, 로그인 사용자 동작은 인증을 헤더로 대체해 검증한다.
실제 계정·토큰·DB 는 tests/test_order_db.py 에서 검증한다.
"""

from dataclasses import replace
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient

from app.application.purchases.cart_service import CartService
from app.application.purchases.order_service import OrderService
from app.core.config import get_settings
from app.presentation.purchases.dependencies import get_cart_service, get_order_service
from tests.purchases_fakes import CARROT, ONION, RETIRED, USER_A, USER_B, FakeUnitOfWork
from tests.test_cart_api import SECRET, bearer, build_app

CART = "/api/v1/purchases/cart"
ORDERS = "/api/v1/purchases/orders"
SHIPPING = {
    "recipient_name": "홍길동",
    "recipient_phone": "01012345678",
    "postal_code": "06236",
    "address": "서울 강남구 테헤란로 1",
    "address_detail": "101동 202호",
}


def body(**overrides):
    return {"request_key": str(uuid4()), "shipping": dict(SHIPPING), "payment_method": "card", **overrides}


def make_app(uow, fake_auth):
    app = build_app(uow, fake_auth=fake_auth)
    app.dependency_overrides[get_cart_service] = lambda: CartService(uow)
    app.dependency_overrides[get_order_service] = lambda: OrderService(uow)
    return app


@pytest.fixture
async def env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    get_settings.cache_clear()
    uow = FakeUnitOfWork()
    async with AsyncClient(transport=ASGITransport(app=make_app(uow, True)), base_url="http://test") as client:
        yield type("Env", (), {"client": client, "uow": uow})
    get_settings.cache_clear()


@pytest.fixture
async def real_auth(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    get_settings.cache_clear()
    uow = FakeUnitOfWork()
    async with AsyncClient(transport=ASGITransport(app=make_app(uow, False)), base_url="http://test") as client:
        yield type("Env", (), {"client": client, "uow": uow})
    get_settings.cache_clear()


async def fill_cart(env, user=USER_A, carrot=2, onion=0):
    h = bearer(user)
    await env.client.post(f"{CART}/items", json={"product_id": CARROT.id, "quantity": carrot}, headers=h)
    if onion:
        await env.client.post(f"{CART}/items", json={"product_id": ONION.id, "quantity": onion}, headers=h)
    return h


async def test_login_is_required_with_real_auth(real_auth):
    c = real_auth.client
    assert (await c.post(ORDERS, json=body())).status_code == 401
    assert (await c.get(ORDERS)).status_code == 401
    assert (await c.get(f"{ORDERS}/{uuid4()}")).status_code == 401
    assert (await c.get(ORDERS, headers={"Authorization": "Bearer not-a-token"})).status_code == 401
    assert real_auth.uow.orders_committed == {}


async def test_place_order_returns_201_with_snapshot_and_server_amounts(env):
    h = await fill_cart(env, carrot=2, onion=1)  # 6,000 + 4,500 = 10,500 (+ 배송비 3,500)
    r = await env.client.post(ORDERS, json=body(expected_total_amount=14_000), headers=h)
    assert r.status_code == 201, r.text
    order = r.json()
    assert order["status"] == "paid" and order["payment_method"] == "card" and order["paid_at"]
    assert (order["items_total"], order["shipping_fee"], order["total_amount"]) == (10_500, 3_500, 14_000)
    assert [(i["product_id"], i["unit_price"], i["quantity"], i["line_total"]) for i in order["items"]] == [
        (CARROT.id, 3_000, 2, 6_000),
        (ONION.id, 4_500, 1, 4_500),
    ]
    assert order["shipping"] == {**SHIPPING}
    assert (await env.client.get(CART, headers=h)).json() == {"items": [], "subtotal_amount": 0}  # 장바구니 정리


async def test_same_request_key_returns_200_and_same_order(env):
    h = await fill_cart(env)
    payload = body()
    first = await env.client.post(ORDERS, json=payload, headers=h)
    again = await env.client.post(ORDERS, json=payload, headers=h)
    assert (first.status_code, again.status_code) == (201, 200)
    assert again.json()["id"] == first.json()["id"]
    assert len(env.uow.orders_committed) == 1


async def test_payment_methods_are_recorded(env):
    for method in ("card", "bank_transfer", "easy_pay"):
        h = await fill_cart(env)
        r = await env.client.post(ORDERS, json=body(payment_method=method), headers=h)
        assert r.status_code == 201 and r.json()["payment_method"] == method


@pytest.mark.parametrize(
    "overrides",
    [
        {"payment_method": "cash"},
        {"payment_method": None},
        {"request_key": "not-a-uuid"},
        {"expected_total_amount": 0},
        {"expected_total_amount": -5},
        {"expected_total_amount": "3000"},
        {"expected_total_amount": True},
        {"expected_total_amount": 12.5},
        {"user_id": str(USER_B)},  # 요청으로 사용자를 정할 수 없다
        {"total_amount": 1},  # 서버가 금액을 계산하므로 금액 필드는 받지 않는다
        {"items": [{"product_id": CARROT.id, "quantity": 1, "unit_price": 1}]},
    ],
)
async def test_invalid_request_body_is_422_and_saves_nothing(env, overrides):
    h = await fill_cart(env)
    r = await env.client.post(ORDERS, json=body(**overrides), headers=h)
    assert r.status_code == 422
    assert env.uow.orders_committed == {} and env.uow.quantity(USER_A, CARROT.id) == 2


async def test_missing_shipping_is_422(env):
    h = await fill_cart(env)
    payload = body()
    del payload["shipping"]
    assert (await env.client.post(ORDERS, json=payload, headers=h)).status_code == 422


@pytest.mark.parametrize(
    "shipping",
    [
        {"recipient_name": "김"},
        {"recipient_phone": "010-1234-5678"},
        {"postal_code": "0623"},
        {"address": "서울"},
        {"address_detail": "   "},
        {"address_detail": ""},
        {"user_id": str(USER_B)},
    ],
)
async def test_invalid_shipping_is_422_and_saves_nothing(env, shipping):
    h = await fill_cart(env)
    r = await env.client.post(ORDERS, json=body(shipping={**SHIPPING, **shipping}), headers=h)
    assert r.status_code == 422
    assert env.uow.orders_committed == {} and env.uow.quantity(USER_A, CARROT.id) == 2


async def test_empty_cart_is_409(env):
    r = await env.client.post(ORDERS, json=body(), headers=bearer(USER_A))
    assert r.status_code == 409 and r.json() == {"detail": "장바구니가 비어 있습니다."}


async def test_inactive_product_is_409_and_cart_is_kept(env):
    h = await fill_cart(env, onion=1)
    env.uow.products[ONION.id] = replace(ONION, is_active=False)
    r = await env.client.post(ORDERS, json=body(), headers=h)
    assert r.status_code == 409
    assert env.uow.orders_committed == {} and env.uow.quantity(USER_A, ONION.id) == 1


@pytest.mark.parametrize("claimed", [1, 3_000, 9_499, 9_501, 1_000_000])
async def test_client_amount_that_differs_from_server_is_409_not_applied(env, claimed):
    h = await fill_cart(env)  # 6,000 + 3,500 = 9,500
    r = await env.client.post(ORDERS, json=body(expected_total_amount=claimed), headers=h)
    assert r.status_code == 409
    assert env.uow.orders_committed == {} and env.uow.quantity(USER_A, CARROT.id) == 2


async def test_list_and_detail_are_limited_to_own_orders(env):
    a = await fill_cart(env, USER_A)
    b = await fill_cart(env, USER_B)
    order_a = (await env.client.post(ORDERS, json=body(), headers=a)).json()
    order_b = (await env.client.post(ORDERS, json=body(), headers=b)).json()

    mine = (await env.client.get(ORDERS, headers=a)).json()
    assert mine["total"] == 1 and [o["id"] for o in mine["items"]] == [order_a["id"]]
    assert (mine["page"], mine["size"]) == (1, 20)
    assert (await env.client.get(f"{ORDERS}/{order_a['id']}", headers=a)).json()["id"] == order_a["id"]
    # 남의 주문·없는 주문은 같은 404 라서 존재 여부도 알 수 없다
    assert (await env.client.get(f"{ORDERS}/{order_b['id']}", headers=a)).status_code == 404
    assert (await env.client.get(f"{ORDERS}/{uuid4()}", headers=a)).status_code == 404
    assert (await env.client.get(f"{ORDERS}/not-a-uuid", headers=a)).status_code == 422


@pytest.mark.parametrize("params", [{"page": 0}, {"size": 0}, {"size": 101}, {"page": "x"}])
async def test_list_paging_validation(env, params):
    assert (await env.client.get(ORDERS, params=params, headers=bearer(USER_A))).status_code == 422


async def test_list_is_paged(env):
    h = bearer(USER_A)
    for _ in range(3):
        await fill_cart(env)
        assert (await env.client.post(ORDERS, json=body(), headers=h)).status_code == 201
    page1 = (await env.client.get(ORDERS, params={"page": 1, "size": 2}, headers=h)).json()
    page2 = (await env.client.get(ORDERS, params={"page": 2, "size": 2}, headers=h)).json()
    assert (page1["total"], len(page1["items"]), len(page2["items"])) == (3, 2, 1)


async def test_failure_midway_returns_500_and_keeps_everything(env):
    h = await fill_cart(env)
    env.uow.fail_on_remove_cart = RuntimeError("장바구니 정리 실패")
    app = make_app(env.uow, True)
    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as client:
        r = await client.post(ORDERS, json=body(), headers=h)
    assert r.status_code == 500
    assert env.uow.orders_committed == {} and env.uow.quantity(USER_A, CARROT.id) == 2
