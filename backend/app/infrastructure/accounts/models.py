"""회원·차단 토큰 ORM 모델.

실제 테이블 생성은 별도 마이그레이션 합의 후 진행한다.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, Computed, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class AccountBase(DeclarativeBase):
    """다른 기능의 메타데이터와 섞이지 않는 회원 전용 Base."""


class AppUserModel(AccountBase):
    __tablename__ = "app_users"

    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True
    )
    email: Mapped[str] = mapped_column(Text, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text, default="user", server_default="user")
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    supabase_user_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), unique=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class RevokedTokenModel(AccountBase):
    __tablename__ = "revoked_tokens"

    jti: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("app_users.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AdminRegistrationModel(AccountBase):
    __tablename__ = "admin_registrations"

    account_id: Mapped[UUID] = mapped_column(
        "id", PGUUID(as_uuid=True), primary_key=True
    )
    username: Mapped[str] = mapped_column(Text, unique=True, index=True)
    username_key: Mapped[str] = mapped_column(
        Text, Computed("lower(username)"), unique=True
    )
    email: Mapped[str] = mapped_column(Text)
    email_key: Mapped[str] = mapped_column(
        Text, Computed("lower(btrim(email))"), unique=True
    )
    display_name: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        Text, default="pending", server_default="pending", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ProfileModel(AccountBase):
    __tablename__ = "profiles"

    # 현재 DB는 auth.users(id)를 참조한다. app_users 통합 방식이 합의되기 전에는
    # ORM에서 다른 소유 테이블로의 FK를 임의 선언하지 않는다.
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    nickname: Mapped[str] = mapped_column(Text)
    recipient_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    recipient_phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    postal_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    address_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
