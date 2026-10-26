"""체험 예약 API 테스트. 실제 DB 에 HTTP 요청을 보내 검증한다. DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다.

인증은 지나의 공통 인증(app_users 계정 → /accounts/login → Bearer 토큰 → 블랙리스트 로그아웃)을 그대로 쓴다.
테스트가 만든 계정·체험·회차·예약은 끝나면 모두 삭제한다.
"""

import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.application.accounts.security import hash_password
from app.core.config import Settings, get_settings
from app.infrastructure.accounts.models import AppUserModel
from app.infrastructure.experiences.models import (
    ExperienceModel,
    ExperienceReservationModel,
    ExperienceSessionModel,
)
from app.main import app, lifespan

SETTINGS = Settings()
pytestmark = pytest.mark.skipif(
    not (SETTINGS.database_url and SETTINGS.jwt_secret_key), reason="DATABASE_URL·JWT_SECRET_KEY 가 없어 건너뜁니다."
)
BASE = "/api/v1/experiences"


@pytest.fixture
async def env():
    get_settings.cache_clear()
    engine = create_async_engine(SETTINGS.database_url)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    exp_id = f"test-{uuid4().hex[:8]}"
    sessions, user_ids = [], []
    async with maker() as s:
        s.add(ExperienceModel(id=exp_id, title="테스트 김장 체험", farm_name="테스트농장", region="테스트도", fee=0))
        await s.commit()

    async def new_session(capacity=5, days=7, status="open"):
        sid = uuid4()
        sessions.append(sid)
        async with maker() as s:
            s.add(ExperienceSessionModel(id=sid, experience_id=exp_id, status=status, capacity=capacity,
                                         starts_at=datetime.now(timezone.utc) + timedelta(days=days)))
            await s.commit()
        return sid

    async with lifespan(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:

            async def make_user(role="user", is_active=True):
                """실제 계정 생성 → 실제 로그인 API 로 토큰 발급. (user_id, 헤더, 비밀번호 없이 쓸 토큰)"""
                password = secrets.token_urlsafe(12)
                email = f"test-{uuid4().hex[:10]}@example.test"
                user_id = uuid4()
                user_ids.append(user_id)
                async with maker() as s:
                    s.add(AppUserModel(id=user_id, email=email, password_hash=hash_password(password),
                                       role=role, is_active=is_active))
                    await s.commit()
                res = await client.post("/api/v1/accounts/login", data={"username": email, "password": password})
                assert res.status_code == 200, res.text
                token = res.json()["access_token"]
                return user_id, {"Authorization": f"Bearer {token}"}

            async def deactivate(user_id):
                async with maker() as s:
                    row = await s.get(AppUserModel, user_id)
                    row.is_active = False
                    await s.commit()

            yield type("Env", (), {"client": client, "new_session": staticmethod(new_session), "exp_id": exp_id,
                                   "make_user": staticmethod(make_user), "deactivate": staticmethod(deactivate)})

    async with maker() as s:
        await s.execute(delete(ExperienceReservationModel).where(ExperienceReservationModel.session_id.in_(sessions)))
        await s.execute(delete(ExperienceSessionModel).where(ExperienceSessionModel.experience_id == exp_id))
        await s.execute(delete(ExperienceModel).where(ExperienceModel.id == exp_id))
        await s.execute(delete(AppUserModel).where(AppUserModel.id.in_(user_ids)))  # revoked_tokens 는 cascade
        await s.commit()
    await engine.dispose()


async def test_public_list_search_and_pagination(env):
    r = await env.client.get(BASE, params={"q": "테스트 김장", "page": 1, "size": 1})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1 and body["size"] == 1 and len(body["items"]) == 1
    assert (await env.client.get(BASE, params={"q": "존재하지않는검색어zzz"})).json()["total"] == 0
    assert (await env.client.get(BASE, params={"size": 101})).status_code == 422
    assert (await env.client.get(BASE, params={"page": 0})).status_code == 422


async def test_detail_shows_sessions_with_remaining_and_404(env):
    sid = await env.new_session(capacity=4)
    body = (await env.client.get(f"{BASE}/{env.exp_id}")).json()
    assert body["sessions"][0]["id"] == str(sid) and body["sessions"][0]["remaining"] == 4
    assert (await env.client.get(f"{BASE}/없는체험")).status_code == 404


async def test_reserve_requires_valid_login(env):
    sid = await env.new_session()
    url = f"{BASE}/{env.exp_id}/sessions/{sid}/reservations"
    assert (await env.client.post(url, json={"headcount": 1})).status_code == 401
    bad = await env.client.post(url, json={"headcount": 1}, headers={"Authorization": "Bearer not.a.token"})
    assert bad.status_code == 401
    # 서명은 맞지만 지나의 토큰 규격(jti·type 등)을 갖추지 않은 토큰도 거부
    import jwt
    loose = jwt.encode({"sub": str(uuid4()), "role": "user", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                       SETTINGS.jwt_secret_key, algorithm=SETTINGS.jwt_algorithm)
    assert (await env.client.post(url, json={"headcount": 1}, headers={"Authorization": f"Bearer {loose}"})).status_code == 401
    # 토큰은 유효하지만 DB 에 없는 사용자도 거부
    ghost = jwt.encode({"sub": str(uuid4()), "role": "user", "jti": uuid4().hex, "type": "access",
                        "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
                       SETTINGS.jwt_secret_key, algorithm=SETTINGS.jwt_algorithm)
    assert (await env.client.post(url, json={"headcount": 1}, headers={"Authorization": f"Bearer {ghost}"})).status_code == 401


async def test_logged_out_token_is_rejected_on_experience_apis(env):
    """로그아웃(블랙리스트) 후 같은 토큰으로 체험 예약 API 를 부르면 401."""
    sid = await env.new_session()
    _, headers = await env.make_user()
    url = f"{BASE}/{env.exp_id}/sessions/{sid}/reservations"
    assert (await env.client.get(f"{BASE}/reservations/me", headers=headers)).status_code == 200  # 로그아웃 전에는 통과
    assert (await env.client.post("/api/v1/accounts/logout", headers=headers)).status_code in (200, 204)
    assert (await env.client.get(f"{BASE}/reservations/me", headers=headers)).status_code == 401
    assert (await env.client.post(url, json={"headcount": 1}, headers=headers)).status_code == 401
    assert (await env.client.post(f"{BASE}/reservations/{uuid4()}/cancel", headers=headers)).status_code == 401


async def test_deactivated_user_is_rejected(env):
    uid, headers = await env.make_user()
    assert (await env.client.get(f"{BASE}/reservations/me", headers=headers)).status_code == 200
    await env.deactivate(uid)
    assert (await env.client.get(f"{BASE}/reservations/me", headers=headers)).status_code == 401


async def test_reserve_my_reservations_cancel_flow(env):
    sid = await env.new_session(capacity=5)
    user, headers = await env.make_user()
    _, other = await env.make_user()
    url = f"{BASE}/{env.exp_id}/sessions/{sid}/reservations"

    created = await env.client.post(url, json={"headcount": 3}, headers=headers)
    assert created.status_code == 201 and created.json()["headcount"] == 3
    assert created.json()["user_id"] == str(user)
    assert (await env.client.get(f"{BASE}/{env.exp_id}")).json()["sessions"][0]["remaining"] == 2

    mine = await env.client.get(f"{BASE}/reservations/me", headers=headers)
    assert [x["id"] for x in mine.json()] == [created.json()["id"]]
    assert mine.json()[0]["experience_title"] == "테스트 김장 체험" and mine.json()[0]["experience_id"] == env.exp_id
    assert mine.json()[0]["starts_at"]
    assert (await env.client.get(f"{BASE}/reservations/me", headers=other)).json() == []  # 다른 사용자에겐 안 보임

    cancelled = await env.client.post(f"{BASE}/reservations/{created.json()['id']}/cancel", headers=headers)
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"
    assert (await env.client.get(f"{BASE}/{env.exp_id}")).json()["sessions"][0]["remaining"] == 5


async def test_business_rule_violations_return_expected_status(env):
    sid = await env.new_session(capacity=2)
    _, headers = await env.make_user()
    _, other = await env.make_user()
    url = f"{BASE}/{env.exp_id}/sessions/{sid}/reservations"
    assert (await env.client.post(url, json={"headcount": 0}, headers=headers)).status_code == 422
    assert (await env.client.post(url, json={"headcount": 11}, headers=headers)).status_code == 422
    assert (await env.client.post(url, json={}, headers=headers)).status_code == 422
    assert (await env.client.post(url, json={"headcount": 3}, headers=headers)).status_code == 409  # 정원 초과
    assert (await env.client.post(url, json={"headcount": 1}, headers=headers)).status_code == 201
    assert (await env.client.post(url, json={"headcount": 1}, headers=headers)).status_code == 409  # 중복
    wrong = f"{BASE}/다른체험/sessions/{sid}/reservations"
    assert (await env.client.post(wrong, json={"headcount": 1}, headers=other)).status_code == 404
    gone = f"{BASE}/{env.exp_id}/sessions/{uuid4()}/reservations"
    assert (await env.client.post(gone, json={"headcount": 1}, headers=other)).status_code == 404


async def test_started_session_rejected(env):
    _, headers = await env.make_user()
    past = await env.new_session(days=-1)
    r = await env.client.post(f"{BASE}/{env.exp_id}/sessions/{past}/reservations", json={"headcount": 1}, headers=headers)
    assert r.status_code == 409


async def test_other_user_cannot_cancel_and_double_cancel_conflicts(env):
    sid = await env.new_session()
    _, owner = await env.make_user()
    _, other = await env.make_user()
    res = (await env.client.post(f"{BASE}/{env.exp_id}/sessions/{sid}/reservations", json={"headcount": 1}, headers=owner)).json()
    cancel = f"{BASE}/reservations/{res['id']}/cancel"
    assert (await env.client.post(cancel, headers=other)).status_code == 403
    assert (await env.client.post(cancel)).status_code == 401
    assert (await env.client.post(cancel, headers=owner)).status_code == 200
    assert (await env.client.post(cancel, headers=owner)).status_code == 409
    assert (await env.client.post(f"{BASE}/reservations/{uuid4()}/cancel", headers=other)).status_code == 404


async def test_admin_endpoints_require_admin_role(env):
    sid = await env.new_session()
    _, user = await env.make_user()
    _, admin = await env.make_user(role="admin")
    await env.client.post(f"{BASE}/{env.exp_id}/sessions/{sid}/reservations", json={"headcount": 2}, headers=user)

    listing, close = f"{BASE}/admin/reservations", f"{BASE}/admin/sessions/{sid}/close"
    assert (await env.client.get(listing)).status_code == 401
    assert (await env.client.get(listing, headers=user)).status_code == 403
    assert (await env.client.post(close, headers=user)).status_code == 403

    rows = await env.client.get(listing, params={"session_id": str(sid), "status": "reserved"}, headers=admin)
    assert rows.status_code == 200 and rows.json()["total"] == 1 and rows.json()["items"][0]["headcount"] == 2
    assert rows.json()["items"][0]["experience_title"] == "테스트 김장 체험"

    assert (await env.client.post(close, headers=admin)).json()["status"] == "closed"
    assert (await env.client.post(close, headers=admin)).status_code == 409  # 이미 마감
    blocked = await env.client.post(f"{BASE}/{env.exp_id}/sessions/{sid}/reservations", json={"headcount": 1}, headers=user)
    assert blocked.status_code == 409  # 마감 후 신규 예약 차단
    assert (await env.client.post(f"{BASE}/admin/sessions/{uuid4()}/close", headers=admin)).status_code == 404
