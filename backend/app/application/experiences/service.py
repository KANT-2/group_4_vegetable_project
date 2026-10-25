"""체험 예약 응용 서비스. 조회 → 도메인 행위 → 저장 → 트랜잭션 완료를 조율한다. 업무 규칙 판단은 도메인에 맡긴다."""

from collections.abc import Callable
from datetime import datetime, timezone
from uuid import UUID

from app.application.experiences.ports import ExperienceUnitOfWork
from app.application.experiences.read_models import ReservationDetail
from app.domain.experiences.models import Experience, ExperienceSession, Reservation, ReservationStatus


class NotFound(Exception):
    """대상(체험·회차·예약)이 없다. 표현 계층에서 404 로 변환한다."""


class ExperienceService:
    def __init__(self, uow: ExperienceUnitOfWork, clock: Callable[[], datetime] | None = None):
        self._uow = uow
        self._now = clock or (lambda: datetime.now(timezone.utc))

    # --- 조회 ---
    async def list_experiences(
        self, q: str | None, region: str | None, page: int, size: int
    ) -> tuple[list[Experience], int]:
        return await self._uow.repo.list_experiences(q, region, page, size)

    async def get_experience(self, experience_id: str) -> tuple[Experience, list[ExperienceSession]]:
        experience = await self._uow.repo.get_experience(experience_id)
        if experience is None:
            raise NotFound("체험을 찾을 수 없습니다.")
        return experience, await self._uow.repo.list_sessions(experience_id)

    async def list_my_reservations(self, user_id: UUID) -> list[ReservationDetail]:
        return await self._uow.repo.list_user_reservations(user_id)

    # --- 예약·취소 (트랜잭션) ---
    async def reserve(
        self, session_id: UUID, user_id: UUID, headcount: int, experience_id: str | None = None
    ) -> Reservation:
        repo = self._uow.repo
        try:
            # 회차 행을 잠가 같은 회차의 동시 예약이 정원 검사를 건너뛰지 못하게 한다.
            session = await repo.get_session(session_id, for_update=True)
            if session is None or (experience_id is not None and session.experience_id != experience_id):
                raise NotFound("회차를 찾을 수 없습니다.")
            duplicate = await repo.has_active_reservation(session_id, user_id)
            reservation = session.reserve(user_id, headcount, self._now(), duplicate)
            await repo.add_reservation(reservation)
            await self._uow.commit()
            return reservation
        except Exception:
            await self._uow.rollback()
            raise

    async def cancel(self, reservation_id: UUID, user_id: UUID) -> Reservation:
        repo = self._uow.repo
        try:
            reservation = await repo.get_reservation(reservation_id, for_update=True)
            if reservation is None:
                raise NotFound("예약을 찾을 수 없습니다.")
            session = await repo.get_session(reservation.session_id, for_update=True)
            if session is None:
                raise NotFound("회차를 찾을 수 없습니다.")
            reservation.cancel(user_id, session.starts_at, self._now())
            session.release(reservation.headcount)
            await repo.update_reservation(reservation)
            await self._uow.commit()
            return reservation
        except Exception:
            await self._uow.rollback()
            raise

    # --- 관리자 ---
    async def list_reservations(
        self, session_id: UUID | None, status: ReservationStatus | None, page: int, size: int
    ) -> tuple[list[ReservationDetail], int]:
        return await self._uow.repo.list_reservations(session_id, status, page, size)

    async def close_session(self, session_id: UUID) -> ExperienceSession:
        repo = self._uow.repo
        try:
            session = await repo.get_session(session_id, for_update=True)
            if session is None:
                raise NotFound("회차를 찾을 수 없습니다.")
            session.close()
            await repo.update_session_status(session)
            await self._uow.commit()
            return session
        except Exception:
            await self._uow.rollback()
            raise
