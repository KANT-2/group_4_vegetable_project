"""회원·인증 API 요청·응답 스키마."""

import re
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.application.accounts.read_models import MyAccount
from app.domain.accounts.models import Profile, ShippingAddress, UserRole


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminRegistrationIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str = Field(pattern=r"^[!-~]{4,40}$")
    password: str = Field(min_length=12, max_length=128, pattern=r"^[!-~]+$")
    display_name: str = Field(min_length=1, max_length=60)
    email: str = Field(max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class AdminRegistrationOut(BaseModel):
    status: str


class NicknameUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nickname: str = Field(min_length=2, max_length=20)


class ShippingAddressIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipient_name: str = Field(min_length=2, max_length=40)
    recipient_phone: str
    postal_code: str = Field(pattern=r"^\d{5}$")
    address: str = Field(min_length=5, max_length=200)
    address_detail: str = Field(default="", max_length=100)

    @field_validator("recipient_phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        normalized = re.sub(r"[- ]", "", value.strip())
        if not re.fullmatch(r"0\d{8,10}", normalized):
            raise ValueError("연락처 형식이 올바르지 않습니다.")
        return normalized

    def to_domain(self) -> ShippingAddress:
        return ShippingAddress(**self.model_dump())


class ShippingAddressOut(ShippingAddressIn):
    @classmethod
    def from_domain(cls, address: ShippingAddress) -> "ShippingAddressOut":
        return cls(**address.__dict__)


class ProfileOut(BaseModel):
    user_id: UUID
    nickname: str
    shipping_address: ShippingAddressOut | None

    @classmethod
    def from_domain(cls, profile: Profile) -> "ProfileOut":
        shipping = (
            ShippingAddressOut.from_domain(profile.shipping_address)
            if profile.shipping_address
            else None
        )
        return cls(
            user_id=profile.user_id,
            nickname=profile.nickname,
            shipping_address=shipping,
        )


class MeOut(BaseModel):
    id: UUID
    email: str
    role: UserRole
    profile: ProfileOut

    @classmethod
    def from_read_model(cls, value: MyAccount) -> "MeOut":
        return cls(
            id=value.account.id,
            email=value.account.email,
            role=value.account.role,
            profile=ProfileOut.from_domain(value.profile),
        )
