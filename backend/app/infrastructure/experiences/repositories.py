"""체험 예약 Repository. ORM 모델 ↔ 순수 도메인 객체 변환을 여기서 담당한다."""

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.experiences.models import (
    DuplicateReservation,
    Experience,
    ExperienceSession,
    Reservation,
    ReservationStatus,
    SessionStatus,
)
from app.infrastructure.experiences.models import (
    ExperienceModel,
    ExperienceReservationModel as ReservationModel,
    ExperienceSessionModel as SessionModel,
)


def _to_experience(m: ExperienceModel) -> Experience:
    return Experience(
        id=m.id, title=m.title, farm_name=m.farm_name, region=m.region, fee=m.fee,
        description=m.description, image_path=m.image_path, is_active=m.is_active,
    )


def _to_session(m: SessionModel, reserved: int) -> ExperienceSession:
    return ExperienceSession(
        id=m.id, experience_id=m.experience_id, starts_at=m.starts_at, capacity=m.capacity,
        status=SessionStatus(m.status), reserved_headcount=reserved,
    )


def _to_reservation(m: ReservationModel) -> Reservation:
    return Reservation(
        id=m.id, session_id=m.session_id, user_id=m.user_id, headcount=m.headcount,
        status=ReservationStatus(m.status), created_at=m.created_at, cancelled_at=m.cancelled_at,
    )


class SqlAlchemyExperienceRepository:
    def __init__(self, session: AsyncSession):
        self._s = session

    async def list_experiences(self, q, region, page, size):
        stmt = select(ExperienceModel).where(ExperienceModel.is_active.is_(True))
        if q:
            like = f"%{q}%"
            stmt = stmt.where(ExperienceModel.title.ilike(like) | ExperienceModel.farm_name.ilike(like))
        if region:
            stmt = stmt.where(ExperienceModel.region.ilike(f"%{region}%"))
        total = await self._s.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = await self._s.scalars(
            stmt.order_by(ExperienceModel.created_at, ExperienceModel.id).offset((page - 1) * size).limit(size)
        )
        return [_to_experience(r) for r in rows], total or 0

    async def get_experience(self, experience_id):
        m = await self._s.get(ExperienceModel, experience_id)
        return _to_experience(m) if m and m.is_active else None

    async def _reserved(self, session_id: UUID) -> int:
        total = await self._s.scalar(
            select(func.coalesce(func.sum(ReservationModel.headcount), 0)).where(
                ReservationModel.session_id == session_id, ReservationModel.status == "reserved"
            )
        )
        return int(total or 0)

    async def list_sessions(self, experience_id):
        rows = await self._s.scalars(
            select(SessionModel).where(SessionModel.experience_id == experience_id).order_by(SessionModel.starts_at)
        )
        return [_to_session(m, await self._reserved(m.id)) for m in rows]

    async def get_session(self, session_id, for_update=False):
        stmt = select(SessionModel).where(SessionModel.id == session_id)
        if for_update:
            stmt = stmt.with_for_update()  # 같은 회차의 동시 예약·취소를 순서대로 처리
        m = await self._s.scalar(stmt)
        return _to_session(m, await self._reserved(m.id)) if m else None

    async def has_active_reservation(self, session_id, user_id):
        found = await self._s.scalar(
            select(ReservationModel.id).where(
                ReservationModel.session_id == session_id,
                ReservationModel.user_id == user_id,
                ReservationModel.status == "reserved",
            )
        )
        return found is not None

    async def add_reservation(self, reservation):
        self._s.add(
            ReservationModel(
                id=reservation.id, session_id=reservation.session_id, user_id=reservation.user_id,
                headcount=reservation.headcount, status=reservation.status.value, created_at=reservation.created_at,
            )
        )
        try:
            await self._s.flush()
        except IntegrityError as e:  # 서비스 검사를 통과한 동시 중복도 부분 유니크 인덱스가 막는다
            raise DuplicateReservation("이미 이 회차를 예약했습니다.") from e

    async def get_reservation(self, reservation_id, for_update=False):
        stmt = select(ReservationModel).where(ReservationModel.id == reservation_id)
        if for_update:
            stmt = stmt.with_for_update()
        m = await self._s.scalar(stmt)
        return _to_reservation(m) if m else None

    async def update_reservation(self, reservation):
        m = await self._s.get(ReservationModel, reservation.id)
        m.status = reservation.status.value
        m.cancelled_at = reservation.cancelled_at
        await self._s.flush()

    async def update_session_status(self, session):
        m = await self._s.get(SessionModel, session.id)
        m.status = session.status.value
        await self._s.flush()

    async def list_user_reservations(self, user_id):
        rows = await self._s.scalars(
            select(ReservationModel).where(ReservationModel.user_id == user_id).order_by(ReservationModel.created_at.desc())
        )
        return [_to_reservation(r) for r in rows]

    async def list_reservations(self, session_id, status, page, size):
        stmt = select(ReservationModel)
        if session_id:
            stmt = stmt.where(ReservationModel.session_id == session_id)
        if status:
            stmt = stmt.where(ReservationModel.status == status.value)
        total = await self._s.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = await self._s.scalars(
            stmt.order_by(ReservationModel.created_at.desc()).offset((page - 1) * size).limit(size)
        )
        return [_to_reservation(r) for r in rows], total or 0


class SqlAlchemyExperienceUnitOfWork:
    """요청 단위 AsyncSession 을 감싸 트랜잭션 경계를 응용 서비스에 노출한다."""

    def __init__(self, session: AsyncSession):
        self._session = session
        self.repo = SqlAlchemyExperienceRepository(session)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
