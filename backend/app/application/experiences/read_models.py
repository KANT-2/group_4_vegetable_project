"""화면 표시용 조회 모델. 업무 규칙이 없는 읽기 전용 값이라 도메인이 아닌 응용 계층에 둔다."""

from dataclasses import dataclass
from datetime import datetime

from app.domain.experiences.models import Reservation


@dataclass(frozen=True)
class ReservationDetail:
    """예약 + 어느 체험·회차인지(이름·시작 시간)."""

    reservation: Reservation
    experience_id: str
    experience_title: str
    starts_at: datetime
