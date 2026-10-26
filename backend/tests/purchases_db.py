"""구매(장바구니·주문) 실제 DB 테스트용 공통 환경. DATABASE_URL·JWT_SECRET_KEY 가 없으면 사용하는 테스트가 건너뛴다.

- 계정은 지나 님 합의대로 auth.users 와 app_users 를 같은 UUID 로 만들고(supabase_user_id 도 같은 값), 실제 로그인 API 로 토큰을 받는다.
- 상품은 'test-' 접두어 테스트 전용 행만 만든다. 기존 상품 행은 읽지도 바꾸지도 않는다.
- 끝나면 만든 계정(→ 장바구니·주문·프로필은 외래키 cascade)과 상품을 모두 지운다.
"""

import secrets
from contextlib import asynccontextmanager
from uuid import UUID, uuid4

from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.application.accounts.security import hash_password
from app.core.config import Settings, get_settings
from app.main import app, lifespan

SETTINGS = Settings()
DB_READY = bool(SETTINGS.database_url and SETTINGS.jwt_secret_key)
SKIP_REASON = "DATABASE_URL·JWT_SECRET_KEY 가 없어 실제 DB 테스트를 건너뜁니다."

CART = "/api/v1/purchases/cart"
ORDERS = "/api/v1/purchases/orders"

SHIPPING = {
    "recipient_name": "테스트수령인",
    "recipient_phone": "01012345678",
    "postal_code": "06236",
    "address": "서울 강남구 테스트로 1",
    "address_detail": "101동 202호",
}


class PurchaseEnv:
    def __init__(self, client, maker, vegetable_id):
        self.client = client
        self.maker = maker
        self.vegetable_id = vegetable_id
        self.user_ids: list[UUID] = []
        self.product_ids: list[str] = []

    async def make_user(self):
        """auth.users + app_users 를 같은 UUID 로 만들고 실제 로그인으로 토큰을 받는다. (user_id, 헤더)"""
        user_id = uuid4()
        email = f"test-{uuid4().hex[:10]}@example.test"
        password = secrets.token_urlsafe(12)
        self.user_ids.append(user_id)
        async with self.maker() as s:
            await s.execute(
                text("insert into auth.users (id, email) values (:id, :email)"), {"id": user_id, "email": email}
            )
            await s.execute(
                text(
                    "insert into public.app_users (id, email, password_hash, role, is_active, supabase_user_id) "
                    "values (:id, :email, :hash, 'user', true, :id)"
                ),
                {"id": user_id, "email": email, "hash": hash_password(password)},
            )
            await s.commit()
        res = await self.client.post("/api/v1/accounts/login", data={"username": email, "password": password})
        assert res.status_code == 200, res.text
        return user_id, {"Authorization": f"Bearer {res.json()['access_token']}"}

    async def new_product(self, price=3_000, name="테스트 당근", unit="1kg", active=True) -> str:
        product_id = f"test-{uuid4().hex[:10]}"
        self.product_ids.append(product_id)
        async with self.maker() as s:
            await s.execute(
                text(
                    "insert into public.products (id, vegetable_id, name, price, original_price, unit, ugly_reason, "
                    "description, farm_name, is_active) values (:id, :veg, :name, :price, :price, :unit, 'bent', "
                    "'테스트 상품', '테스트농장', :active)"
                ),
                {"id": product_id, "veg": self.vegetable_id, "name": name, "price": price, "unit": unit, "active": active},
            )
            await s.commit()
        return product_id

    async def set_active(self, product_id: str, active: bool) -> None:
        assert product_id in self.product_ids  # 테스트가 만든 상품만 바꾼다
        async with self.maker() as s:
            await s.execute(text("update public.products set is_active=:a where id=:id"), {"a": active, "id": product_id})
            await s.commit()

    async def set_price(self, product_id: str, price: int) -> None:
        assert product_id in self.product_ids
        async with self.maker() as s:
            await s.execute(
                text("update public.products set price=:p, original_price=:p where id=:id"), {"p": price, "id": product_id}
            )
            await s.commit()

    async def scalar(self, sql: str, **params):
        async with self.maker() as s:
            return (await s.execute(text(sql), params)).scalar()

    async def execute(self, sql: str, **params) -> None:
        """쓰기 문장 실행(커밋 포함). 테스트가 만든 행을 바꾸는 데만 쓴다."""
        async with self.maker() as s:
            await s.execute(text(sql), params)
            await s.commit()

    async def rows(self, sql: str, **params):
        async with self.maker() as s:
            return (await s.execute(text(sql), params)).all()

    async def cleanup(self) -> None:
        async with self.maker() as s:
            for user_id in self.user_ids:
                await s.execute(text("delete from public.app_users where id=:id"), {"id": user_id})  # revoked_tokens cascade
                await s.execute(text("delete from auth.users where id=:id"), {"id": user_id})  # 장바구니·주문·프로필 cascade
            for product_id in self.product_ids:
                await s.execute(text("delete from public.products where id=:id"), {"id": product_id})
            await s.commit()


@asynccontextmanager
async def purchase_env():
    get_settings.cache_clear()
    engine = create_async_engine(SETTINGS.database_url)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        vegetable_id = (await s.execute(text("select id from public.vegetables order by id limit 1"))).scalar()
    assert vegetable_id, "테스트 상품을 만들 채소 행이 필요합니다."
    env = None
    try:
        async with lifespan(app):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                env = PurchaseEnv(client, maker, vegetable_id)
                yield env
    finally:
        if env is not None:
            await env.cleanup()
        await engine.dispose()
