"""공통 오류 처리(app/core/error_handlers.py) 회귀 테스트. 실제 DB 에 연결해 확인한다.

DB 가 거부하는 입력(널 문자 등)이 어느 기능에서 들어와도 500 이 아니라 422 로 알려지는지 본다.
DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다. 테스트가 만든 계정은 끝나면 삭제한다.
"""

import secrets
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.application.accounts.security import hash_password
from app.core.config import Settings, get_settings
from app.infrastructure.accounts.models import AppUserModel
from app.main import app, lifespan

SETTINGS = Settings()
pytestmark = pytest.mark.skipif(
    not (SETTINGS.database_url and SETTINGS.jwt_secret_key), reason="DATABASE_URL·JWT_SECRET_KEY 가 없어 건너뜁니다."
)
API = "/api/v1"
NUL = chr(0)


@pytest.fixture
async def ctx():
    get_settings.cache_clear()
    engine = create_async_engine(SETTINGS.database_url)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    uid, email, password = uuid4(), f"test-{uuid4().hex[:10]}@example.test", secrets.token_urlsafe(12)
    async with maker() as s:
        s.add(AppUserModel(id=uid, email=email, password_hash=hash_password(password), role="user", is_active=True))
        await s.commit()
    async with lifespan(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.post(f"{API}/accounts/login", data={"username": email, "password": password})
            assert res.status_code == 200
            yield type("Ctx", (), {"client": client, "headers": {"Authorization": f"Bearer {res.json()['access_token']}"}})
    async with maker() as s:
        await s.execute(delete(AppUserModel).where(AppUserModel.id == uid))
        await s.commit()
    await engine.dispose()


async def test_nul_character_in_login_email_is_422_not_500(ctx):
    r = await ctx.client.post(f"{API}/accounts/login", data={"username": f"a{NUL}@b.c", "password": "x"})
    assert r.status_code == 422 and set(r.json()) == {"detail"}


async def test_nul_character_in_cart_inputs_is_422_not_500(ctx):
    h = ctx.headers
    add = await ctx.client.post(f"{API}/purchases/cart/items", json={"product_id": f"a{NUL}", "quantity": 1}, headers=h)
    assert add.status_code == 422
    assert (await ctx.client.patch(f"{API}/purchases/cart/items/%00", json={"quantity": 1}, headers=h)).status_code == 422
    assert (await ctx.client.delete(f"{API}/purchases/cart/items/%00", headers=h)).status_code == 422


async def test_error_responses_are_json_without_internal_details(ctx):
    r = await ctx.client.post(f"{API}/accounts/login", data={"username": f"a{NUL}@b.c", "password": "x"})
    for word in ("Traceback", "sqlalchemy", "asyncpg", "postgresql"):
        assert word.lower() not in r.text.lower()
