"""회원·인증·마이페이지 실제 DB 종단 간 검증.

테스트 전용 이메일만 생성하고 종료 시 관련 행을 모두 삭제한다.
DATABASE_URL·JWT_SECRET_KEY가 없으면 건너뛴다.
"""

from contextlib import asynccontextmanager
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import Settings, get_settings
from app.main import app, lifespan


SETTINGS = Settings()
pytestmark = pytest.mark.skipif(
    not (SETTINGS.database_url and SETTINGS.jwt_secret_key),
    reason="DATABASE_URL·JWT_SECRET_KEY가 없어 실제 DB 테스트를 건너뜁니다.",
)


@asynccontextmanager
async def account_env():
    get_settings.cache_clear()
    engine = create_async_engine(SETTINGS.database_url, poolclass=NullPool)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    emails: list[str] = []
    try:
        # 이전 실행이 강제 종료됐을 때 남은 이 테스트 파일 전용 계정만 정리한다.
        async with maker() as session:
            stale_ids = (
                await session.execute(
                    text(
                        "select id from public.app_users "
                        "where email like 'test-account-%@example.test' "
                        "or email like 'test-admin-%@example.test'"
                    )
                )
            ).scalars().all()
            for user_id in stale_ids:
                await session.execute(
                    text("delete from public.admin_registrations where id=:id"),
                    {"id": user_id},
                )
                await session.execute(
                    text("delete from public.profiles where id=:id"), {"id": user_id}
                )
                await session.execute(
                    text("delete from public.app_users where id=:id"), {"id": user_id}
                )
                await session.execute(
                    text("delete from auth.users where id=:id"), {"id": user_id}
                )
            await session.commit()
        async with lifespan(app):
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as client:
                yield client, emails
    finally:
        async with maker() as session:
            for email in emails:
                user_id = await session.scalar(
                    text("select id from public.app_users where email=:email"),
                    {"email": email},
                )
                if user_id is None:
                    continue
                await session.execute(
                    text("delete from public.admin_registrations where id=:id"),
                    {"id": user_id},
                )
                await session.execute(
                    text("delete from public.profiles where id=:id"), {"id": user_id}
                )
                await session.execute(
                    text("delete from public.app_users where id=:id"), {"id": user_id}
                )
                await session.execute(
                    text("delete from auth.users where id=:id"), {"id": user_id}
                )
            await session.commit()
        await engine.dispose()


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_account_profile_address_logout_and_permissions_against_real_db():
    suffix = uuid4().hex[:10]
    email = f"test-account-{suffix}@example.test"
    username = f"test_account_{suffix}"
    password = "TestPassword123!"

    async with account_env() as (client, emails):
        emails.append(email)
        registered = await client.post(
            "/api/v1/accounts/register",
            json={
                "username": username,
                "email": email,
                "nickname": "테스트회원",
                "password": password,
            },
        )
        assert registered.status_code == 201, registered.text

        wrong = await client.post(
            "/api/v1/accounts/login",
            data={"username": username, "password": "wrong-password"},
        )
        assert wrong.status_code == 401

        logged_in = await client.post(
            "/api/v1/accounts/login",
            data={"username": username, "password": password},
        )
        assert logged_in.status_code == 200, logged_in.text
        token = logged_in.json()["access_token"]
        headers = bearer(token)

        me = await client.get("/api/v1/accounts/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["profile"]["nickname"] == "테스트회원"

        changed = await client.patch(
            "/api/v1/accounts/me/profile",
            json={"nickname": "수정회원"},
            headers=headers,
        )
        assert changed.status_code == 200

        address = {
            "recipient_name": "테스트수령인",
            "recipient_phone": "01012345678",
            "postal_code": "06236",
            "address": "서울 강남구 테스트로 1",
            "address_detail": "101호",
        }
        saved = await client.put(
            "/api/v1/accounts/me/address", json=address, headers=headers
        )
        assert saved.status_code == 200

        reloaded = await client.get("/api/v1/accounts/me", headers=headers)
        assert reloaded.status_code == 200
        assert reloaded.json()["profile"]["nickname"] == "수정회원"
        assert reloaded.json()["profile"]["shipping_address"] == address

        injected = await client.patch(
            "/api/v1/accounts/me/profile",
            json={"nickname": "침입", "user_id": str(uuid4())},
            headers=headers,
        )
        assert injected.status_code == 422

        forbidden = await client.get(
            "/api/v1/experiences/admin/reservations", headers=headers
        )
        assert forbidden.status_code == 403

        logged_out = await client.post(
            "/api/v1/accounts/logout", headers=headers
        )
        assert logged_out.status_code == 204
        assert (await client.get("/api/v1/accounts/me", headers=headers)).status_code == 401


async def test_pending_admin_registration_cannot_log_in_against_real_db():
    suffix = uuid4().hex[:10]
    email = f"test-admin-{suffix}@example.test"
    username = f"test_admin_{suffix}"
    password = "AdminPassword123!"

    async with account_env() as (client, emails):
        emails.append(email)
        registered = await client.post(
            "/api/v1/accounts/admin-registrations",
            json={
                "username": username,
                "email": email,
                "display_name": "관리자신청자",
                "password": password,
            },
        )
        assert registered.status_code == 201, registered.text
        assert registered.json() == {"status": "pending"}

        login = await client.post(
            "/api/v1/accounts/login",
            data={"username": username, "password": password},
        )
        assert login.status_code == 401
