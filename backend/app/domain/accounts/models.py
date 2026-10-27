"""회원·인증 도메인의 공통 값 객체."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
import re
from uuid import UUID


class UserRole(StrEnum):
    USER = "user"
    ADMIN = "admin"


class AdminRegistrationStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass(frozen=True)
class Account:
    id: UUID
    email: str
    password_hash: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    username: str | None = None


@dataclass(frozen=True)
class AuthenticatedUser:
    id: UUID
    role: UserRole
    is_active: bool = True

    @property
    def is_admin(self) -> bool:
        return self.role is UserRole.ADMIN


@dataclass(frozen=True)
class AdminRegistration:
    account_id: UUID
    username: str
    display_name: str
    status: AdminRegistrationStatus = AdminRegistrationStatus.PENDING
    created_at: datetime | None = None
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None

    def __post_init__(self) -> None:
        username = self.username.strip().lower()
        display_name = self.display_name.strip()
        if not re.fullmatch(r"[!-~]{4,40}", username):
            raise ValueError("관리자 아이디는 공백 없는 ASCII 문자 4~40자여야 합니다.")
        if not 1 <= len(display_name) <= 60:
            raise ValueError("관리자 이름은 1~60자여야 합니다.")
        reviewed = self.reviewed_by is not None or self.reviewed_at is not None
        if self.status is AdminRegistrationStatus.PENDING and reviewed:
            raise ValueError("대기 중인 신청에는 검토 정보를 기록할 수 없습니다.")
        if self.status is not AdminRegistrationStatus.PENDING and (
            self.reviewed_by is None or self.reviewed_at is None
        ):
            raise ValueError("처리된 신청에는 검토자와 검토 시각이 필요합니다.")
        object.__setattr__(self, "username", username)
        object.__setattr__(self, "display_name", display_name)


@dataclass(frozen=True)
class AccessTokenPayload:
    user_id: UUID
    role: UserRole
    jti: str
    expires_at: datetime


@dataclass(frozen=True)
class ShippingAddress:
    recipient_name: str
    recipient_phone: str
    postal_code: str
    address: str
    address_detail: str = ""

    def __post_init__(self) -> None:
        name = self.recipient_name.strip()
        phone = re.sub(r"[- ]", "", self.recipient_phone.strip())
        postal_code = self.postal_code.strip()
        address = self.address.strip()
        detail = self.address_detail.strip()
        if not 2 <= len(name) <= 40:
            raise ValueError("받는 분 이름은 2~40자여야 합니다.")
        if not re.fullmatch(r"0\d{8,10}", phone):
            raise ValueError("연락처 형식이 올바르지 않습니다.")
        if not re.fullmatch(r"\d{5}", postal_code):
            raise ValueError("우편번호는 숫자 5자리여야 합니다.")
        if not 5 <= len(address) <= 200:
            raise ValueError("주소는 5~200자여야 합니다.")
        if len(detail) > 100:
            raise ValueError("상세 주소는 100자 이하여야 합니다.")
        object.__setattr__(self, "recipient_name", name)
        object.__setattr__(self, "recipient_phone", phone)
        object.__setattr__(self, "postal_code", postal_code)
        object.__setattr__(self, "address", address)
        object.__setattr__(self, "address_detail", detail)


@dataclass(frozen=True)
class Profile:
    user_id: UUID
    nickname: str
    shipping_address: ShippingAddress | None = None

    def __post_init__(self) -> None:
        nickname = self.nickname.strip()
        if not 2 <= len(nickname) <= 20:
            raise ValueError("닉네임은 2~20자여야 합니다.")
        object.__setattr__(self, "nickname", nickname)
