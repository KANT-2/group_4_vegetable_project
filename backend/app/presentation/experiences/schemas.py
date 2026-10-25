"""체험 예약 요청·응답 스키마 (Pydantic)."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.domain.experiences.models import MAX_HEADCOUNT, ReservationStatus, SessionStatus


class ReservationCreate(BaseModel):
    headcount: int = Field(ge=1, le=MAX_HEADCOUNT, description=f"참가 인원 (1~{MAX_HEADCOUNT}명)")


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


class ExperienceList(BaseModel):
    items: list[ExperienceOut]
    total: int
    page: int
    size: int


class ReservationList(BaseModel):
    items: list[ReservationOut]
    total: int
    page: int
    size: int
