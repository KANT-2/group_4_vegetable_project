"""체험 예약 API 테스트. 실제 DB 에 HTTP 요청을 보내 검증한다. DATABASE_URL·JWT_SECRET_KEY 가 없으면 건너뛴다.

인증은 임시 어댑터(합의 중인 토큰 규격)를 검증한다. 지나의 공통 인증·블랙리스트와의 연동 검증은 별도다.
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
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


def token(user_id=None, role="user", **extra):
    claims = {"sub": str(user_id or uuid4()), "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=1), **extra}
    return jwt.encode(claims, SETTINGS.jwt_secret_key, algorithm=SETTINGS.jwt_algorithm)


def auth(user_id=None, role="user"):
    return {"Authorization": f"Bearer {token(user_id, role)}"}


@pytest.fixture
async def env():
    get_settings.cache_clear()
    engine = create_async_engine(SETTINGS.database_url)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    exp_id = f"test-{uuid4().hex[:8]}"
    sessions = []
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
            yield type("Env", (), {"client": client, "new_session": staticmethod(new_session), "exp_id": exp_id})

    async with maker() as s:
        await s.execute(delete(ExperienceReservationModel).where(ExperienceReservationModel.session_id.in_(sessions)))
        await s.execute(delete(ExperienceSessionModel).where(ExperienceSessionModel.experience_id == exp_id))
        await s.execute(delete(ExperienceModel).where(ExperienceModel.id == exp_id))
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


async def test_reserve_requires_login(env):
    sid = await env.new_session()
    url = f"{BASE}/{env.exp_id}/sessions/{sid}/reservations"
    assert (await env.client.post(url, json={"headcount": 1})).status_code == 401
    bad = await env.client.post(url, json={"headcount": 1}, headers={"Authorization": "Bearer not.a.token"})
    assert bad.status_code == 401
    expired = jwt.encode({"sub": str(uuid4()), "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
                         SETTINGS.jwt_secret_key, algorithm=SETTINGS.jwt_algorithm)
    assert (await env.client.post(url, json={"headcount": 1}, headers={"Authorization": f"Bearer {expired}"})).status_code == 401


async def test_reserve_my_reservations_cancel_flow(env):
    sid, user = await env.new_session(capacity=5), uuid4()
    url = f"{BASE}/{env.exp_id}/sessions/{sid}/reservations"

    created = await env.client.post(url, json={"headcount": 3}, headers=auth(user))
    assert created.status_code == 201 and created.json()["headcount"] == 3
    assert (await env.client.get(f"{BASE}/{env.exp_id}")).json()["sessions"][0]["remaining"] == 2

    mine = await env.client.get(f"{BASE}/reservations/me", headers=auth(user))
    assert [x["id"] for x in mine.json()] == [created.json()["id"]]
    assert (await env.client.get(f"{BASE}/reservations/me", headers=auth())).json() == []  # 다른 사용자에겐 안 보임

    cancelled = await env.client.post(f"{BASE}/reservations/{created.json()['id']}/cancel", headers=auth(user))
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"
    assert (await env.client.get(f"{BASE}/{env.exp_id}")).json()["sessions"][0]["remaining"] == 5


async def test_business_rule_violations_return_expected_status(env):
    sid, user = await env.new_session(capacity=2), uuid4()
    url = f"{BASE}/{env.exp_id}/sessions/{sid}/reservations"
    assert (await env.client.post(url, json={"headcount": 0}, headers=auth(user))).status_code == 422
    assert (await env.client.post(url, json={"headcount": 11}, headers=auth(user))).status_code == 422
    assert (await env.client.post(url, json={}, headers=auth(user))).status_code == 422
    assert (await env.client.post(url, json={"headcount": 3}, headers=auth(user))).status_code == 409  # 정원 초과
    assert (await env.client.post(url, json={"headcount": 1}, headers=auth(user))).status_code == 201
    assert (await env.client.post(url, json={"headcount": 1}, headers=auth(user))).status_code == 409  # 중복
    wrong = f"{BASE}/다른체험/sessions/{sid}/reservations"
    assert (await env.client.post(wrong, json={"headcount": 1}, headers=auth())).status_code == 404
    gone = f"{BASE}/{env.exp_id}/sessions/{uuid4()}/reservations"
    assert (await env.client.post(gone, json={"headcount": 1}, headers=auth())).status_code == 404


async def test_started_session_and_cancel_deadline(env):
    past = await env.new_session(days=-1)
    r = await env.client.post(f"{BASE}/{env.exp_id}/sessions/{past}/reservations", json={"headcount": 1}, headers=auth())
    assert r.status_code == 409
    soon, user = await env.new_session(days=0), uuid4()  # 지금 시작: 이미 시작
    assert (await env.client.post(f"{BASE}/{env.exp_id}/sessions/{soon}/reservations", json={"headcount": 1}, headers=auth(user))).status_code == 409


async def test_other_user_cannot_cancel_and_double_cancel_conflicts(env):
    sid, owner = await env.new_session(), uuid4()
    res = (await env.client.post(f"{BASE}/{env.exp_id}/sessions/{sid}/reservations", json={"headcount": 1}, headers=auth(owner))).json()
    cancel = f"{BASE}/reservations/{res['id']}/cancel"
    assert (await env.client.post(cancel, headers=auth())).status_code == 403
    assert (await env.client.post(cancel)).status_code == 401
    assert (await env.client.post(cancel, headers=auth(owner))).status_code == 200
    assert (await env.client.post(cancel, headers=auth(owner))).status_code == 409
    assert (await env.client.post(f"{BASE}/reservations/{uuid4()}/cancel", headers=auth())).status_code == 404


async def test_admin_endpoints_require_admin_role(env):
    sid, user = await env.new_session(), uuid4()
    await env.client.post(f"{BASE}/{env.exp_id}/sessions/{sid}/reservations", json={"headcount": 2}, headers=auth(user))

    listing, close = f"{BASE}/admin/reservations", f"{BASE}/admin/sessions/{sid}/close"
    assert (await env.client.get(listing)).status_code == 401
    assert (await env.client.get(listing, headers=auth(role="user"))).status_code == 403
    assert (await env.client.post(close, headers=auth(role="user"))).status_code == 403

    admin = auth(role="admin")
    rows = await env.client.get(listing, params={"session_id": str(sid), "status": "reserved"}, headers=admin)
    assert rows.status_code == 200 and rows.json()["total"] == 1 and rows.json()["items"][0]["headcount"] == 2

    assert (await env.client.post(close, headers=admin)).json()["status"] == "closed"
    assert (await env.client.post(close, headers=admin)).status_code == 409  # 이미 마감
    blocked = await env.client.post(f"{BASE}/{env.exp_id}/sessions/{sid}/reservations", json={"headcount": 1}, headers=auth())
    assert blocked.status_code == 409  # 마감 후 신규 예약 차단
    assert (await env.client.post(f"{BASE}/admin/sessions/{uuid4()}/close", headers=admin)).status_code == 404
