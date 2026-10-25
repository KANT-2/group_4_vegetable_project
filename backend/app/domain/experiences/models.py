"""체험 예약 도메인. 형준 담당. 순수 파이썬: FastAPI·SQLAlchemy 등 외부 프레임워크에 의존하지 않는다."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import StrEnum
from uuid import UUID, uuid4

MAX_HEADCOUNT = 10
CANCEL_DEADLINE = timedelta(hours=24)  # 시작 24시간 전까지만 취소 가능 (팀 확인 필요)


class SessionStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"


class ReservationStatus(StrEnum):
    RESERVED = "reserved"
    CANCELLED = "cancelled"


@dataclass
class Experience:
    id: str
    title: str
    farm_name: str
    region: str
    fee: int = 0
    description: str = ""
    image_path: str | None = None
    is_active: bool = True

    def __post_init__(self) -> None:
        if not self.title.strip():
            raise ValueError("체험 이름은 비어 있을 수 없습니다.")
        if self.fee < 0:
            raise ValueError("참가비는 0 이상이어야 합니다.")


@dataclass
class Reservation:
    id: UUID
    session_id: UUID
    user_id: UUID
    headcount: int
    status: ReservationStatus = ReservationStatus.RESERVED
    created_at: datetime | None = None
    cancelled_at: datetime | None = None

    def __post_init__(self) -> None:
        if not 1 <= self.headcount <= MAX_HEADCOUNT:
            raise InvalidHeadcount(f"참가 인원은 1~{MAX_HEADCOUNT}명이어야 합니다.")

    @property
    def is_active(self) -> bool:
        return self.status is ReservationStatus.RESERVED

    def cancel(self, user_id: UUID, starts_at: datetime, now: datetime) -> None:
        """본인 예약만, 활성 상태에서, 시작 24시간 전까지만 취소할 수 있다."""
        if user_id != self.user_id:
            raise NotReservationOwner("본인의 예약만 취소할 수 있습니다.")
        if not self.is_active:
            raise AlreadyCancelled("이미 취소된 예약입니다.")
        if now > starts_at - CANCEL_DEADLINE:
            raise CancellationNotAllowed("체험 시작 24시간 전까지만 취소할 수 있습니다.")
        self.status = ReservationStatus.CANCELLED
        self.cancelled_at = now


@dataclass
class ExperienceSession:
    id: UUID
    experience_id: str
    starts_at: datetime
    capacity: int
    status: SessionStatus = SessionStatus.OPEN
    # 현재 활성 예약 인원 합계. 저장소가 채워 주는 읽기 값이며 예약·취소 판단에 쓴다.
    reserved_headcount: int = 0
    reservations: list[Reservation] = field(default_factory=list, repr=False)

    def __post_init__(self) -> None:
        if self.capacity <= 0:
            raise ValueError("정원은 1명 이상이어야 합니다.")

    @property
    def remaining(self) -> int:
        return max(self.capacity - self.reserved_headcount, 0)

    def reserve(
        self, user_id: UUID, headcount: int, now: datetime, user_has_active_reservation: bool
    ) -> Reservation:
        """예약 규칙을 모두 검사하고 새 예약을 만든다. 저장은 응용 서비스가 한다."""
        if not 1 <= headcount <= MAX_HEADCOUNT:
            raise InvalidHeadcount(f"참가 인원은 1~{MAX_HEADCOUNT}명이어야 합니다.")
        if self.status is SessionStatus.CLOSED:
            raise SessionClosed("접수가 마감된 회차입니다.")
        if now >= self.starts_at:
            raise SessionAlreadyStarted("이미 시작했거나 지난 회차입니다.")
        if user_has_active_reservation:
            raise DuplicateReservation("이미 이 회차를 예약했습니다.")
        if headcount > self.remaining:
            raise CapacityExceeded(f"잔여 인원({self.remaining}명)을 초과했습니다.")
        self.reserved_headcount += headcount
        return Reservation(
            id=uuid4(), session_id=self.id, user_id=user_id, headcount=headcount, created_at=now
        )

    def release(self, headcount: int) -> None:
        """취소된 예약 인원을 정원에 되돌린다."""
        self.reserved_headcount = max(self.reserved_headcount - headcount, 0)

    def close(self) -> None:
        if self.status is SessionStatus.CLOSED:
            raise SessionClosed("이미 마감된 회차입니다.")
        self.status = SessionStatus.CLOSED


class ExperienceDomainError(Exception):
    """체험 예약 업무 규칙 위반의 공통 부모."""


class InvalidHeadcount(ExperienceDomainError, ValueError):
    pass


class SessionClosed(ExperienceDomainError):
    pass


class SessionAlreadyStarted(ExperienceDomainError):
    pass


class DuplicateReservation(ExperienceDomainError):
    pass


class CapacityExceeded(ExperienceDomainError):
    pass


class NotReservationOwner(ExperienceDomainError):
    pass


class AlreadyCancelled(ExperienceDomainError):
    pass


class CancellationNotAllowed(ExperienceDomainError):
    pass
