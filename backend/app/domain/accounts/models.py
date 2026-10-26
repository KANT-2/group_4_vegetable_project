"""회원·인증 도메인의 공통 값 객체."""

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
import re
from uuid import UUID


class UserRole(StrEnum):
    USER = "user"
    ADMIN = "admin"


@dataclass(frozen=True)
class Account:
    id: UUID
    email: str
    password_hash: str
    role: UserRole = UserRole.USER
    is_active: bool = True


@dataclass(frozen=True)
class AuthenticatedUser:
    id: UUID
    role: UserRole
    is_active: bool = True

    @property
    def is_admin(self) -> bool:
        return self.role is UserRole.ADMIN


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
