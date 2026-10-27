from copy import deepcopy
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID
import pytest
from fastapi import FastAPI, Header, HTTPException
from httpx import ASGITransport, AsyncClient
from app.application.catalog.ports import Filters
from app.application.catalog.service import CatalogService
from app.domain.accounts.models import AuthenticatedUser, UserRole
from app.domain.catalog.models import Product
from app.presentation.accounts.dependencies import get_current_user
from app.presentation.catalog.dependencies import get_catalog_service
from app.presentation.catalog.router import router

USER_A = UUID("11111111-1111-4111-8111-111111111111")
USER_B = UUID("22222222-2222-4222-8222-222222222222")
NOW = datetime(2026, 10, 26, tzinfo=UTC)
BASE = "/api/v1/catalog"


def item(id="carrot", **updates):
    return dict(id=id, vegetable_id="carrot", name="당근", category="root", price=1000, original_price=2000, unit="1kg", ugly_reason="bent", description="상품", farm_name="농장", is_active=True, is_featured=False, is_seasonal=False, stock=20, created_at=NOW, updated_at=NOW, **updates)


class MemoryUow:
    def __init__(self):
        self.products = {"carrot": item(), "retired": item("retired") | {"is_active": False}}
        self.wishes = set()
        self.repo = self
        self.fail = False
        self.commits = 0
        self.rollbacks = 0
        self.options = None
        self.snapshot = deepcopy(self.products)

    async def list_products(self, options):
        self.options = options
        rows = [p for p in self.products.values() if options.status == "all" or p["is_active"] == (options.status == "active")]
        return dict(items=rows[(options.page-1)*options.size:options.page*options.size], total=len(rows), page=options.page, size=options.size, reason_counts=dict(small=0, bent=len(rows), scratched=0, irregular=0))

    async def detail(self, id, include_inactive=False):
        p = self.products.get(id)
        return p if p and (include_inactive or p["is_active"]) else None

    async def lock_product(self, id):
        self.snapshot = deepcopy(self.products)
        p = self.products.get(id)
        return Product(id, p["price"], p["original_price"], p["is_active"]) if p else None

    async def save_product(self, p):
        self.products[p.id].update(price=p.price, is_active=p.is_active)

    async def add_wish(self, user_id, product_id):
        self.wishes.add((user_id, product_id))

    async def delete_wish(self, user_id, product_id):
        if (user_id, product_id) not in self.wishes:
            return False
        self.wishes.remove((user_id, product_id))
        return True

    async def wish_ids(self, user_id):
        return [id for uid, id in sorted(self.wishes) if uid == user_id]

    async def list_wishes(self, user_id, page, size):
        ids = await self.wish_ids(user_id)
        return dict(items=[dict(product_id=id, created_at=NOW, product=self.products[id]) for id in ids[(page-1)*size:page*size]], total=len(ids), page=page, size=size)

    async def commit(self):
        if self.fail:
            raise RuntimeError("write failed")
        self.commits += 1

    async def rollback(self):
        self.products = deepcopy(self.snapshot)
        self.rollbacks += 1


async def fake_user(x_user: Annotated[str | None, Header()] = None, x_role: Annotated[str, Header()] = "user"):
    if not x_user:
        raise HTTPException(401, "login required")
    return AuthenticatedUser(UUID(x_user), UserRole(x_role))


def app_for(uow, auth=True):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    app.dependency_overrides[get_catalog_service] = lambda: CatalogService(uow)
    if auth:
        app.dependency_overrides[get_current_user] = fake_user
    return app


def headers(user=USER_A, role="user"):
    return {"X-User": str(user), "X-Role": role}


@pytest.fixture
async def env():
    uow = MemoryUow()
    async with AsyncClient(transport=ASGITransport(app=app_for(uow)), base_url="http://test") as client:
        yield client, uow


async def test_public_list_and_detail_hide_inactive(env):
    c, _ = env
    result = (await c.get(f"{BASE}/products")).json()
    assert result["total"] == 1
    assert [p["id"] for p in result["items"]] == ["carrot"]
    for id in ["retired", "missing"]:
        assert (await c.get(f"{BASE}/products/{id}")).status_code == 404


async def test_filters_and_page_are_passed_to_service(env):
    c, uow = env
    r = await c.get(f"{BASE}/products", params=dict(q="당근", category="root", reason="bent", sort="price_asc", collection=["single", "bulk", "single"], page=2, size=1, min_price=100, max_price=3000))
    assert r.status_code == 200
    assert r.json()["items"] == []
    assert uow.options == Filters(page=2, size=1, q="당근", category="root", reason="bent", sort="price_asc", collection=("bulk", "single"), min_price=100, max_price=3000)


@pytest.mark.parametrize("query", ["page=0", "page=100001", "size=0", "size=101", "category=bad", "sort=bad", "reason=bad", "min_price=-1", "min_price=20&max_price=10", "q="+"x"*101])
async def test_invalid_query_rejected(env, query):
    assert (await env[0].get(f"{BASE}/products?{query}")).status_code == 422


async def test_admin_change_is_visible_on_next_read(env):
    c, uow = env
    r = await c.patch(f"{BASE}/admin/products/carrot", headers=headers(role="admin"), json={"price": 1500})
    assert r.status_code == 200 and r.json()["price"] == 1500
    assert (await c.get(f"{BASE}/products/carrot")).json()["price"] == 1500
    assert uow.commits == 1
    await c.patch(f"{BASE}/admin/products/carrot", headers=headers(role="admin"), json={"is_active": False})
    assert (await c.get(f"{BASE}/products/carrot")).status_code == 404
    assert (await c.get(f"{BASE}/admin/products", headers=headers(role="admin"))).json()["total"] == 2
    await c.patch(f"{BASE}/admin/products/carrot", headers=headers(role="admin"), json={"is_active": True})
    assert (await c.get(f"{BASE}/products/carrot")).status_code == 200


async def test_user_cannot_list_or_update_admin_products(env):
    c, uow = env
    assert (await c.get(f"{BASE}/admin/products", headers=headers())).status_code == 403
    assert (await c.patch(f"{BASE}/admin/products/carrot", headers=headers(), json={"price": 1})).status_code == 403
    assert uow.products["carrot"]["price"] == 1000 and uow.commits == 0


@pytest.mark.parametrize("body", [{}, {"price": None}, {"price": 0}, {"price": -1}, {"price": 2147483648}, {"price": 1.5}, {"price": True}, {"price": "1000"}, {"price": 2001}, {"is_active": "false"}, {"is_active": None}, {"price": 1000, "user_id": str(USER_B)}])
async def test_bad_admin_input_cannot_write(env, body):
    c, uow = env
    assert (await c.patch(f"{BASE}/admin/products/carrot", headers=headers(role="admin"), json=body)).status_code == 422
    assert uow.products["carrot"]["price"] == 1000 and uow.commits == 0


async def test_missing_admin_product_returns_404(env):
    assert (await env[0].patch(f"{BASE}/admin/products/missing", headers=headers(role="admin"), json={"price": 1})).status_code == 404


async def test_wishlist_is_idempotent_and_scoped_to_current_user(env):
    c, uow = env
    for _ in range(3):
        assert (await c.put(f"{BASE}/wishlist/carrot", headers=headers())).status_code == 204
    assert len(uow.wishes) == 1
    assert (await c.get(f"{BASE}/wishlist", headers=headers())).json()["total"] == 1
    assert (await c.get(f"{BASE}/wishlist/ids", headers=headers())).json() == ["carrot"]
    assert (await c.get(f"{BASE}/wishlist", headers=headers(USER_B))).json()["total"] == 0
    assert (await c.delete(f"{BASE}/wishlist/carrot", headers=headers(USER_B))).status_code == 404
    assert (USER_A, "carrot") in uow.wishes
    assert (await c.delete(f"{BASE}/wishlist/carrot", headers=headers())).status_code == 204
    assert not uow.wishes


async def test_inactive_wish_remains_readable_and_removable(env):
    c, uow = env
    await c.put(f"{BASE}/wishlist/carrot", headers=headers())
    uow.products["carrot"]["is_active"] = False
    rows = (await c.get(f"{BASE}/wishlist", headers=headers())).json()["items"]
    assert rows[0]["product"]["is_active"] is False
    assert (await c.put(f"{BASE}/wishlist/retired", headers=headers())).status_code == 404
    assert (await c.delete(f"{BASE}/wishlist/carrot", headers=headers())).status_code == 204


async def test_write_failure_rolls_back():
    uow = MemoryUow()
    uow.fail = True
    with pytest.raises(RuntimeError):
        await CatalogService(uow).revise("carrot", price=1500)
    assert uow.products["carrot"]["price"] == 1000
    assert uow.rollbacks == 1


async def test_real_auth_rejects_missing_and_malformed_tokens_without_db(monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setenv("JWT_SECRET_KEY", "catalog-test-secret-with-at-least-32-bytes")
    get_settings.cache_clear()
    try:
        async with AsyncClient(transport=ASGITransport(app=app_for(MemoryUow(), auth=False)), base_url="http://test") as c:
            for h in [{}, {"Authorization": "Bearer invalid"}]:
                assert (await c.get(f"{BASE}/wishlist", headers=h)).status_code == 401
                assert (await c.put(f"{BASE}/wishlist/carrot", headers=h)).status_code == 401
                assert (await c.delete(f"{BASE}/wishlist/carrot", headers=h)).status_code == 401
                assert (await c.patch(f"{BASE}/admin/products/carrot", headers=h, json={"price": 1})).status_code == 401
    finally:
        get_settings.cache_clear()
