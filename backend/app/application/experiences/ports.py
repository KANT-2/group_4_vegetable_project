"""응용 계층이 인프라에 요구하는 인터페이스. 구현은 infrastructure/experiences 에 있다."""

from typing import Protocol
from uuid import UUID

from app.domain.experiences.models import Experience, ExperienceSession, Reservation, ReservationStatus


class ExperienceRepository(Protocol):
    async def list_experiences(
        self, q: str | None, region: str | None, page: int, size: int
    ) -> tuple[list[Experience], int]: ...

    async def get_experience(self, experience_id: str) -> Experience | None: ...

    async def list_sessions(self, experience_id: str) -> list[ExperienceSession]: ...

    async def get_session(self, session_id: UUID, for_update: bool = False) -> ExperienceSession | None: ...

    async def has_active_reservation(self, session_id: UUID, user_id: UUID) -> bool: ...

    async def add_reservation(self, reservation: Reservation) -> None: ...

    async def get_reservation(self, reservation_id: UUID, for_update: bool = False) -> Reservation | None: ...

    async def update_reservation(self, reservation: Reservation) -> None: ...

    async def update_session_status(self, session: ExperienceSession) -> None: ...

    async def list_user_reservations(self, user_id: UUID) -> list[Reservation]: ...

    async def list_reservations(
        self, session_id: UUID | None, status: ReservationStatus | None, page: int, size: int
    ) -> tuple[list[Reservation], int]: ...


class ExperienceUnitOfWork(Protocol):
    """한 요청의 트랜잭션 경계. 서비스가 commit/rollback 을 결정한다."""

    repo: ExperienceRepository

    async def commit(self) -> None: ...

    async def rollback(self) -> None: ...
