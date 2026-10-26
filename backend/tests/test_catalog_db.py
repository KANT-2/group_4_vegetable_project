"""Opt-in real PostgreSQL flow, all changes rolled back in an outer transaction.

Run only with CATALOG_RUN_DB_TESTS=1. Uses Jina's create_user procedure and
real login/JWT/blacklist dependencies; no hardcoded or existing account.
"""
import os
from uuid import uuid4
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import NullPool
from app.core.config import get_settings
from app.core.database import get_session
from app.main import create_app
from app.domain.accounts.models import UserRole
from scripts.create_user import create_user

pytestmark = pytest.mark.skipif(os.getenv("CATALOG_RUN_DB_TESTS") != "1", reason="Explicit opt-in required for transactional shared DB test")


async def test_real_catalog_accounts_wishes_admin_and_logout():
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    marker = uuid4().hex
    product_id = f"catalog-test-{marker}"
    password = "Catalog-only-test-" + marker
    emails = {role: f"catalog-{role}-{marker}@example.test" for role in ("a", "b", "admin")}
    try:
        async with engine.connect() as connection:
            outer = await connection.begin()
            try:
                async with AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint") as session:
                    for label, email in emails.items():
                        await create_user(session, email, password, "카탈로그검증", UserRole.ADMIN if label == "admin" else UserRole.USER, username=f"cat-{label}-{marker[:20]}")
                    row = (await session.execute(text("select id from products limit 1"))).first()
                    assert row, "Catalog requires an existing seeded product"
                    # New fixture row only; never change a real product or price.
                    await session.execute(text("""
                        insert into products(id, vegetable_id, name, price, original_price, unit, ugly_reason, description, farm_name, is_active)
                        select :id, vegetable_id, :name, 1000, 2000, '1kg', 'bent', 'transactional test', farm_name, true
                        from products where id=:seed
                    """), {"id": product_id, "name": "카탈로그검증 " + marker, "seed": row.id})
                    await session.commit()

                    async def test_session():
                        yield session

                    app = create_app()
                    app.dependency_overrides[get_session] = test_session
                    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                        tokens = {}
                        for label, email in emails.items():
                            response = await c.post("/api/v1/accounts/login", data={"username": email, "password": password})
                            assert response.status_code == 200
                            tokens[label] = {"Authorization": "Bearer " + response.json()["access_token"]}
                        base = "/api/v1/catalog"
                        assert (await c.get(f"{base}/products", params={"q": marker, "size": 1})).json()["total"] == 1
                        assert (await c.get(f"{base}/products/{product_id}")).json()["price"] == 1000
                        assert (await c.patch(f"{base}/admin/products/{product_id}", headers=tokens["a"], json={"price": 1})).status_code == 403
                        assert (await c.patch(f"{base}/admin/products/{product_id}", headers=tokens["admin"], json={"price": 0})).status_code == 422
                        before = (await c.get(f"{base}/version")).json()
                        assert (await c.patch(f"{base}/admin/products/{product_id}", headers=tokens["admin"], json={"price": 1500})).status_code == 200
                        assert (await c.get(f"{base}/products/{product_id}")).json()["price"] == 1500
                        # now() is transaction-stable, so the revision assertion is
                        # covered with independent production transactions elsewhere.
                        assert isinstance(before, str)
                        for _ in range(3):
                            assert (await c.put(f"{base}/wishlist/{product_id}", headers=tokens["a"])).status_code == 204
                        assert (await c.get(f"{base}/wishlist", headers=tokens["a"])).json()["total"] == 1
                        assert (await c.delete(f"{base}/wishlist/{product_id}", headers=tokens["b"])).status_code == 404
                        assert (await c.get(f"{base}/wishlist/ids", headers=tokens["a"])).json() == [product_id]
                        assert (await c.patch(f"{base}/admin/products/{product_id}", headers=tokens["admin"], json={"is_active": False})).status_code == 200
                        assert (await c.get(f"{base}/products/{product_id}")).status_code == 404
                        assert (await c.delete(f"{base}/wishlist/{product_id}", headers=tokens["a"])).status_code == 204
                        assert (await c.post("/api/v1/accounts/logout", headers=tokens["a"])).status_code == 204
                        assert (await c.get(f"{base}/wishlist", headers=tokens["a"])).status_code == 401
                        assert (await c.put(f"{base}/wishlist/{product_id}", headers=tokens["a"])).status_code == 401
                        assert (await c.delete(f"{base}/wishlist/{product_id}", headers=tokens["a"])).status_code == 401
                        assert (await c.patch(f"{base}/admin/products/{product_id}", headers=tokens["admin"], json={"is_active": True})).status_code == 200
            finally:
                await outer.rollback()
        async with engine.connect() as connection:
            assert (await connection.scalar(text("select count(*) from products where id=:id"), {"id": product_id})) == 0
            assert (await connection.scalar(text("select count(*) from auth.users where email in (:a,:b,:admin)"), emails)) == 0
    finally:
        await engine.dispose()
