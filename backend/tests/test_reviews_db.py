"""Actual JWT/DB review flow; all fixtures rolled back, no existing reviews changed."""
import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool
from app.core.config import get_settings
from app.core.database import get_session
from app.main import create_app
from app.domain.accounts.models import UserRole
from scripts.create_user import create_user
from test_reviews import photo

pytestmark = pytest.mark.skipif(os.getenv("REVIEWS_RUN_DB_TESTS") != "1", reason="Opt-in shared DB test")


@pytest.mark.asyncio
async def test_review_flow_permissions_filters_images_and_moderation():
    marker = uuid4().hex[:16]
    product = "review-test-" + marker
    emails = {label: f"review-{label}-{marker}@example.test" for label in ("a", "b", "admin")}
    password = "Review-test-" + marker
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    try:
        async with engine.connect() as connection:
            outer = await connection.begin()
            try:
                async with AsyncSession(bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint") as session:
                    for label, email in emails.items():
                        await create_user(session, email, password, "리뷰검증", UserRole.ADMIN if label == "admin" else UserRole.USER, username=f"rev-{label}-{marker}")
                    await session.execute(text("""INSERT INTO products(id,vegetable_id,name,price,original_price,unit,ugly_reason,description,farm_name,is_active)
                        SELECT :id,vegetable_id,'review fixture',1000,2000,'1kg','bent','fixture',farm_name,true FROM products LIMIT 1"""), {"id": product})
                    await session.commit()
                    async def session_override(): yield session
                    app = create_app()
                    app.dependency_overrides[get_session] = session_override
                    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
                        tokens = {}
                        for label, email in emails.items():
                            r = await c.post("/api/v1/accounts/login", data={"username": email, "password": password})
                            assert r.status_code == 200
                            tokens[label] = {"Authorization": "Bearer " + r.json()["access_token"]}
                        base = "/api/v1/catalog/reviews"
                        form = {"product_id": product, "rating": "5", "content": "정말 신선해요"}
                        assert (await c.post(base, data=form)).status_code == 401
                        assert (await c.post(base, data=form | {"content": " "}, headers=tokens["a"])).status_code == 422
                        assert (await c.post(base, data=form, files=[("images", ("x.png", photo(), "image/png"))] * 4, headers=tokens["a"])).status_code == 422
                        assert (await c.post(base, data=form, files={"images": ("fake.png", b"html", "image/png")}, headers=tokens["a"])).status_code == 422
                        posted = await c.post(base, data=form, files=[("images", (f"{i}.png", photo(), "image/png")) for i in range(3)], headers=tokens["a"])
                        assert posted.status_code == 201, posted.text
                        rid = posted.json()["id"]
                        assert (await c.post(base, data=form, headers=tokens["a"])).status_code == 409
                        assert (await c.post(base, data=form | {"content": "글 리뷰입니다"}, headers=tokens["b"])).status_code == 201
                        # Make ordering deterministic even within the outer transaction.
                        await session.execute(text("UPDATE product_reviews SET created_at=:time WHERE id=:id"), {"time": datetime.now(UTC) - timedelta(days=1), "id": rid})
                        await session.commit()
                        for kind, count in [("all", 2), ("images", 1), ("text", 1)]:
                            result = (await c.get(base, params={"product_id": product, "kind": kind})).json()
                            assert result["total"] == count
                        assert (await c.get(base, params={"product_id": product, "sort": "oldest"})).json()["items"][0]["id"] == rid
                        assert (await c.get(base, params={"product_id": product, "sort": "newest"})).json()["items"][0]["id"] != rid
                        assert (await c.get(base, params={"product_id": product, "page": 2})).json()["items"] == []
                        assert (await c.get(base, params={"product_id": product, "page": 0})).status_code == 422
                        owned = (await c.get(base + "/mine", params={"product_id": product}, headers=tokens["a"])).json()
                        assert owned["id"] == rid and owned["image_count"] == 3
                        assert (await c.get(base + f"/{rid}/images/0")).headers["content-type"] == "image/jpeg"
                        assert (await c.get(base + "/admin", headers=tokens["b"])).status_code == 403
                        assert (await c.request("DELETE", base + f"/admin/{rid}", json={"reason": "무관한 내용"}, headers=tokens["b"])).status_code == 403
                        assert (await c.request("DELETE", base + f"/admin/{rid}", json={"reason": "무관한 내용"}, headers=tokens["admin"])).status_code == 204
                        assert (await c.get(base, params={"product_id": product})).json()["total"] == 1
                        assert (await c.get(base + f"/{rid}/images/0")).status_code == 404
                        hidden = (await c.get(base + "/admin", params={"status": "deleted", "q": "review fixture"}, headers=tokens["admin"])).json()
                        assert hidden["total"] == 1 and hidden["items"][0]["deletion_reason"] == "무관한 내용"
                        assert (await c.post(base + f"/admin/{rid}/restore", headers=tokens["admin"])).status_code == 204
                        assert (await c.get(base, params={"product_id": product})).json()["total"] == 2
                        await c.post("/api/v1/accounts/logout", headers=tokens["a"])
                        assert (await c.post(base, data=form, headers=tokens["a"])).status_code == 401
            finally:
                await outer.rollback()
        async with engine.connect() as conn:
            assert await conn.scalar(text("SELECT count(*) FROM product_reviews WHERE product_id=:id"), {"id": product}) == 0
            assert await conn.scalar(text("SELECT count(*) FROM products WHERE id=:id"), {"id": product}) == 0
            assert await conn.scalar(text("SELECT count(*) FROM auth.users WHERE email IN (:a,:b,:admin)"), emails) == 0
    finally:
        await engine.dispose()
