"""체험 예약 ORM 모델. 테이블은 supabase/migrations/202610250001_experiences.sql 과 같다."""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class ExperienceBase(DeclarativeBase):
    """다른 기능의 Base 와 섞이지 않도록 체험 전용으로 둔다."""


class ExperienceModel(ExperienceBase):
    __tablename__ = "experiences"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, default="")
    farm_name: Mapped[str] = mapped_column(Text)
    region: Mapped[str] = mapped_column(Text)
    fee: Mapped[int] = mapped_column(Integer, default=0)
    image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExperienceSessionModel(ExperienceBase):
    __tablename__ = "experience_sessions"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    experience_id: Mapped[str] = mapped_column(ForeignKey("experiences.id", ondelete="CASCADE"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    capacity: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text, default="open")


class ExperienceReservationModel(ExperienceBase):
    __tablename__ = "experience_reservations"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    session_id: Mapped[UUID] = mapped_column(ForeignKey("experience_sessions.id"))
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True))
    headcount: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(Text, default="reserved")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
