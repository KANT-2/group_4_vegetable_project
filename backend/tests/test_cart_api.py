"""장바구니 API 테스트. 실제 FastAPI 라우터·오류 변환을 거치되 저장소만 메모리로 바꿔 DB 없이 실행한다.

인증은 두 가지로 나눠 검증한다.
- 토큰 검사(없음·잘못됨 → 401)는 지나 님의 실제 공통 인증(get_current_user)을 그대로 쓴다. DB 조회 전에 거부되므로 DB 가 필요 없다.
- 로그인한 사용자의 동작·사용자 분리는 get_current_user 를 요청 헤더(X-Test-User)로 대체해 검증한다.
  실제 계정·실제 토큰·로그아웃(블랙리스트) 401 은 DB 가 필요한 tests/test_cart_db.py 에서 검증한다.
"""

from typing import Annotated

import pytest
from fastapi import FastAPI, Header, HTTPException
from httpx import ASGITransport, AsyncClient

from app.application.purchases.cart_service import CartService
from app.core.config import get_settings
from app.domain.accounts.models import AuthenticatedUser, UserRole
from app.presentation.accounts.dependencies import get_current_user
from app.presentation.purchases.cart_router import router
from app.presentation.purchases.dependencies import get_cart_service
from app.presentation.purchases.errors import register_purchase_error_handlers
from tests.purchases_fakes import CARROT, ONION, RETIRED, USER_A, USER_B, FakeUnitOfWork

BASE = "/api/v1/purchases/cart"
SECRET = "test-secret-key-for-unit-tests-only-0123456789"


def bearer(user_id):
    """로그인한 사용자를 흉내 내는 헤더. 이름은 옛 테스트와 맞추려고 유지했다."""
    return {"X-Test-User": str(user_id)}


async def fake_current_user(x_test_user: Annotated[str | None, Header()] = None) -> AuthenticatedUser:
    if x_test_user is None:
        raise HTTPException(401, "로그인이 필요합니다.")
    from uuid import UUID

    return AuthenticatedUser(id=UUID(x_test_user), role=UserRole.USER)


def build_app(uow, *, fake_auth: bool) -> FastAPI:
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    register_purchase_error_handlers(app)
    app.dependency_overrides[get_cart_service] = lambda: CartService(uow)
    if fake_auth:
        app.dependency_overrides[get_current_user] = fake_current_user
    return app


@pytest.fixture
async def env(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    get_settings.cache_clear()
    uow = FakeUnitOfWork()
    async with AsyncClient(transport=ASGITransport(app=build_app(uow, fake_auth=True)), base_url="http://test") as client:
        yield type("Env", (), {"client": client, "uow": uow})
    get_settings.cache_clear()


@pytest.fixture
async def real_auth(monkeypatch):
    """지나 님의 실제 인증을 그대로 쓰는 앱(대체하지 않음)."""
    monkeypatch.setenv("JWT_SECRET_KEY", SECRET)
    get_settings.cache_clear()
    uow = FakeUnitOfWork()
    async with AsyncClient(transport=ASGITransport(app=build_app(uow, fake_auth=False)), base_url="http://test") as client:
        yield type("Env", (), {"client": client, "uow": uow})
    get_settings.cache_clear()


async def test_login_is_required_with_real_auth(real_auth):
    c = real_auth.client
    assert (await c.get(BASE)).status_code == 401
    assert (await c.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 1})).status_code == 401
    assert (await c.patch(f"{BASE}/items/{CARROT.id}", json={"quantity": 1})).status_code == 401
    assert (await c.delete(f"{BASE}/items/{CARROT.id}")).status_code == 401
    for header in ({"Authorization": "Bearer not-a-token"}, {"Authorization": "Bearer "}, {"Authorization": "Basic abc"}):
        assert (await c.get(BASE, headers=header)).status_code == 401
    assert real_auth.uow.committed == {}


async def test_merge_requires_login_with_real_auth(real_auth):
    body = {"items": [{"product_id": CARROT.id, "quantity": 1}]}
    assert (await real_auth.client.post(f"{BASE}/merge", json=body)).status_code == 401
    assert (await real_auth.client.post(f"{BASE}/merge", json=body, headers={"Authorization": "Bearer x"})).status_code == 401
    assert real_auth.uow.committed == {}


async def test_merge_is_idempotent_and_reports_skipped_products(env):
    h = bearer(USER_A)
    await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 3}, headers=h)
    body = {
        "items": [
            {"product_id": CARROT.id, "quantity": 2},
            {"product_id": ONION.id, "quantity": 4},
            {"product_id": RETIRED.id, "quantity": 1},
            {"product_id": "no-such-product", "quantity": 1},
        ]
    }
    first = await env.client.post(f"{BASE}/merge", json=body, headers=h)
    assert first.status_code == 200
    # 건너뛴 상품은 상품 ID 순서로 항상 같은 순서로 알려 준다
    assert first.json() == {"merged": 2, "skipped_product_ids": sorted([RETIRED.id, "no-such-product"])}
    for _ in range(3):  # 같은 요청을 반복해도 수량이 변하지 않는다
        assert (await env.client.post(f"{BASE}/merge", json=body, headers=h)).json() == first.json()
    cart = (await env.client.get(BASE, headers=h)).json()
    assert {i["product_id"]: i["quantity"] for i in cart["items"]} == {CARROT.id: 3, ONION.id: 4}


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"items": []},
        {"items": [{"product_id": CARROT.id, "quantity": 0}]},
        {"items": [{"product_id": CARROT.id, "quantity": 100}]},
        {"items": [{"product_id": CARROT.id, "quantity": "2"}]},
        {"items": [{"product_id": CARROT.id, "quantity": True}]},
        {"items": [{"product_id": "", "quantity": 1}]},
        {"items": [{"product_id": CARROT.id, "quantity": 1, "user_id": str(USER_B)}]},
        {"items": [{"product_id": CARROT.id, "quantity": 1}], "user_id": str(USER_B)},
        {"items": [{"product_id": f"p-{i}", "quantity": 1} for i in range(51)]},
    ],
)
async def test_merge_rejects_invalid_requests_and_saves_nothing(env, body):
    r = await env.client.post(f"{BASE}/merge", json=body, headers=bearer(USER_A))
    assert r.status_code == 422
    assert env.uow.committed == {}


async def test_merge_does_not_touch_other_users_carts(env):
    await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 4}, headers=bearer(USER_B))
    await env.client.post(
        f"{BASE}/merge", json={"items": [{"product_id": CARROT.id, "quantity": 9}]}, headers=bearer(USER_A)
    )
    assert env.uow.quantity(USER_B, CARROT.id) == 4 and env.uow.quantity(USER_A, CARROT.id) == 9


async def test_login_is_required_with_fake_auth(env):
    assert (await env.client.get(BASE)).status_code == 401


async def test_empty_cart(env):
    r = await env.client.get(BASE, headers=bearer(USER_A))
    assert r.status_code == 200
    assert r.json() == {"items": [], "subtotal_amount": 0}


async def test_add_change_remove_flow(env):
    h = bearer(USER_A)
    r = await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 2}, headers=h)
    assert r.status_code == 201
    assert r.json() == {
        "product_id": CARROT.id, "name": CARROT.name, "unit": CARROT.unit, "unit_price": 3000,
        "quantity": 2, "line_total": 6000, "is_active": True, "image_path": None,
    }

    r = await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 3}, headers=h)
    assert r.json()["quantity"] == 5  # 같은 상품은 합쳐진다

    await env.client.post(f"{BASE}/items", json={"product_id": ONION.id, "quantity": 1}, headers=h)
    r = await env.client.patch(f"{BASE}/items/{CARROT.id}", json={"quantity": 4}, headers=h)
    assert (r.status_code, r.json()["quantity"], r.json()["line_total"]) == (200, 4, 12000)

    cart = (await env.client.get(BASE, headers=h)).json()
    assert [i["product_id"] for i in cart["items"]] == [CARROT.id, ONION.id]
    assert cart["subtotal_amount"] == 12000 + 4500

    assert (await env.client.delete(f"{BASE}/items/{ONION.id}", headers=h)).status_code == 204
    assert (await env.client.get(BASE, headers=h)).json()["subtotal_amount"] == 12000


@pytest.mark.parametrize("quantity", [0, -1, 100, 1.5, "3", True, None])
async def test_invalid_quantity_is_422(env, quantity):
    h = bearer(USER_A)
    r = await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": quantity}, headers=h)
    assert r.status_code == 422
    assert env.uow.committed == {}


async def test_adding_over_total_limit_is_422(env):
    h = bearer(USER_A)
    await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 99}, headers=h)
    r = await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 1}, headers=h)
    assert r.status_code == 422
    assert env.uow.quantity(USER_A, CARROT.id) == 99


async def test_extra_fields_such_as_user_id_are_rejected(env):
    h = bearer(USER_A)
    body = {"product_id": CARROT.id, "quantity": 1, "user_id": str(USER_B)}
    assert (await env.client.post(f"{BASE}/items", json=body, headers=h)).status_code == 422
    assert (await env.client.patch(f"{BASE}/items/{CARROT.id}", json={"quantity": 1, "user_id": str(USER_B)}, headers=h)).status_code == 422
    assert env.uow.committed == {}


async def test_unknown_product_is_404(env):
    r = await env.client.post(f"{BASE}/items", json={"product_id": "nope", "quantity": 1}, headers=bearer(USER_A))
    assert r.status_code == 404
    assert r.json() == {"detail": "상품을 찾을 수 없습니다."}


async def test_inactive_product_is_409(env):
    r = await env.client.post(f"{BASE}/items", json={"product_id": RETIRED.id, "quantity": 1}, headers=bearer(USER_A))
    assert r.status_code == 409
    assert env.uow.committed == {}


async def test_missing_cart_item_is_404(env):
    h = bearer(USER_A)
    assert (await env.client.patch(f"{BASE}/items/{CARROT.id}", json={"quantity": 2}, headers=h)).status_code == 404
    assert (await env.client.delete(f"{BASE}/items/{CARROT.id}", headers=h)).status_code == 404


async def test_other_users_cart_is_unreachable(env):
    await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 2}, headers=bearer(USER_A))

    assert (await env.client.get(BASE, headers=bearer(USER_B))).json()["items"] == []
    assert (await env.client.patch(f"{BASE}/items/{CARROT.id}", json={"quantity": 50}, headers=bearer(USER_B))).status_code == 404
    assert (await env.client.delete(f"{BASE}/items/{CARROT.id}", headers=bearer(USER_B))).status_code == 404
    assert env.uow.quantity(USER_A, CARROT.id) == 2  # A 의 장바구니는 그대로


async def test_sold_out_line_is_listed_but_not_summed(env):
    h = bearer(USER_A)
    await env.client.post(f"{BASE}/items", json={"product_id": CARROT.id, "quantity": 1}, headers=h)
    await env.client.post(f"{BASE}/items", json={"product_id": ONION.id, "quantity": 1}, headers=h)
    env.uow.products[ONION.id] = ONION.__class__(**{**ONION.__dict__, "is_active": False})
    cart = (await env.client.get(BASE, headers=h)).json()
    assert [(i["product_id"], i["is_active"]) for i in cart["items"]] == [(CARROT.id, True), (ONION.id, False)]
    assert cart["subtotal_amount"] == 3000
