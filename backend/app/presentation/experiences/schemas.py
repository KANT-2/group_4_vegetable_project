"""체험 예약 요청·응답 스키마 (Pydantic)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.experiences.models import MAX_HEADCOUNT, ReservationStatus, SessionStatus


class ReservationCreate(BaseModel):
    # strict: "2"(문자열)나 true 를 1·2명으로 바꿔 받지 않고 정수만 허용한다.
    headcount: int = Field(ge=1, le=MAX_HEADCOUNT, strict=True, description=f"참가 인원 (1~{MAX_HEADCOUNT}명)")


class ExperienceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    farm_name: str
    region: str
    fee: int
    image_path: str | None


class SessionOut(BaseModel):
    id: UUID
    experience_id: str
    starts_at: datetime
    capacity: int
    remaining: int
    status: SessionStatus


class ExperienceDetailOut(ExperienceOut):
    sessions: list[SessionOut]


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    user_id: UUID
    headcount: int
    status: ReservationStatus
    created_at: datetime | None
    cancelled_at: datetime | None


class ReservationDetailOut(ReservationOut):
    """목록 화면용: 어느 체험·회차인지 함께 내려준다."""

    experience_id: str
    experience_title: str
    starts_at: datetime

    @classmethod
    def from_detail(cls, d) -> "ReservationDetailOut":
        return cls(
            **ReservationOut.model_validate(d.reservation).model_dump(),
            experience_id=d.experience_id, experience_title=d.experience_title, starts_at=d.starts_at,
        )


class ExperienceList(BaseModel):
    items: list[ExperienceOut]
    total: int
    page: int
    size: int


class ReservationList(BaseModel):
    items: list[ReservationDetailOut]
    total: int
    page: int
    size: int
