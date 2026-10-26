"""체험 예약 응용 서비스 통합 테스트. 실제 PostgreSQL(backend/.env 의 DATABASE_URL)에 연결해 검증한다.

테스트용 체험·회차는 'test-' 접두 ID 로 만들고 끝나면 삭제한다. DATABASE_URL 이 없으면 건너뛴다.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import delete, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.application.experiences.service import ExperienceService, NotFound
from app.core.config import Settings
from app.infrastructure.accounts.models import AppUserModel
from app.domain.experiences.models import (
    CapacityExceeded,
    DuplicateReservation,
    NotReservationOwner,
    SessionClosed,
)
from app.infrastructure.experiences.models import (
    ExperienceModel,
    ExperienceReservationModel,
    ExperienceSessionModel,
)
from app.infrastructure.experiences.repositories import SqlAlchemyExperienceUnitOfWork

DATABASE_URL = Settings().database_url
pytestmark = pytest.mark.skipif(not DATABASE_URL, reason="DATABASE_URL 이 없어 DB 통합 테스트를 건너뜁니다.")


@pytest.fixture
async def env():
    engine = create_async_engine(DATABASE_URL)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    exp_id = f"test-{uuid4().hex[:8]}"
    user_ids = []
    async with maker() as s:
        s.add(ExperienceModel(id=exp_id, title="테스트 체험", farm_name="테스트농장", region="테스트", fee=0))
        await s.commit()

    async def new_session(capacity=5, days=7, status="open"):
        sid = uuid4()
        async with maker() as s:
            s.add(
                ExperienceSessionModel(
                    id=sid, experience_id=exp_id, status=status, capacity=capacity,
                    starts_at=datetime.now(timezone.utc) + timedelta(days=days),
                )
            )
            await s.commit()
        return sid

    async def new_user():
        """예약은 app_users 를 외래키로 참조하므로 저장되는 테스트는 실제 계정 행이 필요하다."""
        uid = uuid4()
        user_ids.append(uid)
        async with maker() as s:
            s.add(AppUserModel(id=uid, email=f"test-{uid.hex[:10]}@example.test", password_hash="not-used", role="user", is_active=True))
            await s.commit()
        return uid

    def service():  # 호출마다 새 세션 = 요청 하나
        s = maker()
        return ExperienceService(SqlAlchemyExperienceUnitOfWork(s)), s

    yield type("Env", (), {"new_session": staticmethod(new_session), "new_user": staticmethod(new_user), "service": staticmethod(service), "maker": maker, "exp_id": exp_id})

    async with maker() as s:
        sess_ids = (await s.execute(text("select id from experience_sessions where experience_id = :e"), {"e": exp_id})).scalars().all()
        await s.execute(delete(ExperienceReservationModel).where(ExperienceReservationModel.session_id.in_(sess_ids)))
        await s.execute(delete(ExperienceSessionModel).where(ExperienceSessionModel.experience_id == exp_id))
        await s.execute(delete(ExperienceModel).where(ExperienceModel.id == exp_id))
        await s.execute(delete(AppUserModel).where(AppUserModel.id.in_(user_ids)))
        await s.commit()
    await engine.dispose()


async def remaining(env, session_id):
    svc, s = env.service()
    async with s:
        _, sessions = await svc.get_experience(env.exp_id)
    return next(x for x in sessions if x.id == session_id).remaining


async def test_reserve_then_my_reservations_then_cancel_restores_seats(env):
    sid, user = await env.new_session(capacity=5), await env.new_user()
    svc, s = env.service()
    async with s:
        reservation = await svc.reserve(sid, user, 3)
    assert await remaining(env, sid) == 2  # 새 세션으로 다시 읽어도 저장돼 있다

    svc, s = env.service()
    async with s:
        mine = await svc.list_my_reservations(user)
    assert [d.reservation.id for d in mine] == [reservation.id]
    assert mine[0].experience_id == env.exp_id and mine[0].experience_title == "테스트 체험"

    svc, s = env.service()
    async with s:
        cancelled = await svc.cancel(reservation.id, user)
    assert not cancelled.is_active
    assert await remaining(env, sid) == 5


async def test_capacity_exceeded_saves_nothing(env):
    sid = await env.new_session(capacity=2)
    svc, s = env.service()
    async with s:
        with pytest.raises(CapacityExceeded):
            await svc.reserve(sid, uuid4(), 3)
    assert await remaining(env, sid) == 2


async def test_duplicate_active_reservation_rejected_but_allowed_after_cancel(env):
    sid, user = await env.new_session(), await env.new_user()
    svc, s = env.service()
    async with s:
        first = await svc.reserve(sid, user, 1)
    svc, s = env.service()
    async with s:
        with pytest.raises(DuplicateReservation):
            await svc.reserve(sid, user, 1)
    svc, s = env.service()
    async with s:
        await svc.cancel(first.id, user)
    svc, s = env.service()
    async with s:
        await svc.reserve(sid, user, 1)  # 취소 후에는 다시 예약 가능


async def test_other_user_cannot_cancel(env):
    sid, owner = await env.new_session(), await env.new_user()
    svc, s = env.service()
    async with s:
        reservation = await svc.reserve(sid, owner, 2)
    svc, s = env.service()
    async with s:
        with pytest.raises(NotReservationOwner):
            await svc.cancel(reservation.id, uuid4())
    assert await remaining(env, sid) == 3  # 예약은 그대로 유지


async def test_closed_session_blocks_new_reservation(env):
    sid = await env.new_session()
    svc, s = env.service()
    async with s:
        await svc.close_session(sid)
    svc, s = env.service()
    async with s:
        with pytest.raises(SessionClosed):
            await svc.reserve(sid, uuid4(), 1)


async def test_missing_session_and_reservation_not_found(env):
    svc, s = env.service()
    async with s:
        with pytest.raises(NotFound):
            await svc.reserve(uuid4(), uuid4(), 1)
        with pytest.raises(NotFound):
            await svc.cancel(uuid4(), uuid4())


async def test_concurrent_requests_for_last_seat_only_one_succeeds(env):
    sid = await env.new_session(capacity=1)

    users = [await env.new_user() for _ in range(5)]

    async def attempt(user):
        svc, s = env.service()
        async with s:
            try:
                await svc.reserve(sid, user, 1)
                return "ok"
            except CapacityExceeded:
                return "full"

    results = await asyncio.gather(*(attempt(u) for u in users))
    assert sorted(results) == ["full"] * 4 + ["ok"]
    assert await remaining(env, sid) == 0


async def test_reservation_for_unknown_user_violates_fk_and_is_not_reported_as_duplicate(env):
    """user_id 는 app_users 를 참조한다. 없는 사용자는 '중복'이 아닌 무결성 오류로 드러나고 아무것도 저장되지 않는다."""
    sid = await env.new_session(capacity=3)
    svc, s = env.service()
    async with s:
        with pytest.raises(IntegrityError):
            await svc.reserve(sid, uuid4(), 1)
    assert await remaining(env, sid) == 3
