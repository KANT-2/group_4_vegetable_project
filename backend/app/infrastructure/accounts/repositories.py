"""회원 Repository와 요청 단위 트랜잭션 구현."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.accounts.models import Account, Profile, ShippingAddress, UserRole
from app.infrastructure.accounts.models import (
    AppUserModel,
    ProfileModel,
    RevokedTokenModel,
)


def _to_account(model: AppUserModel) -> Account:
    return Account(
        id=model.id,
        email=model.email,
        password_hash=model.password_hash,
        role=UserRole(model.role),
        is_active=model.is_active,
    )


def _to_profile(model: ProfileModel) -> Profile:
    shipping = None
    if model.recipient_name is not None:
        shipping = ShippingAddress(
            recipient_name=model.recipient_name,
            recipient_phone=model.recipient_phone or "",
            postal_code=model.postal_code or "",
            address=model.address or "",
            address_detail=model.address_detail or "",
        )
    return Profile(model.id, model.nickname, shipping)


class SqlAlchemyAccountRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_by_email(self, email: str) -> Account | None:
        model = await self._session.scalar(
            select(AppUserModel).where(AppUserModel.email == email)
        )
        return _to_account(model) if model else None

    async def get_by_id(self, user_id) -> Account | None:
        model = await self._session.get(AppUserModel, user_id)
        return _to_account(model) if model else None

    async def get_profile(self, user_id) -> Profile | None:
        model = await self._session.get(ProfileModel, user_id)
        return _to_profile(model) if model else None

    async def save_profile(self, profile: Profile) -> None:
        model = await self._session.get(ProfileModel, profile.user_id)
        if model is None:
            raise LookupError("프로필을 찾을 수 없습니다.")
        model.nickname = profile.nickname
        shipping = profile.shipping_address
        model.recipient_name = shipping.recipient_name if shipping else None
        model.recipient_phone = shipping.recipient_phone if shipping else None
        model.postal_code = shipping.postal_code if shipping else None
        model.address = shipping.address if shipping else None
        model.address_detail = shipping.address_detail if shipping else None
        await self._session.flush()

    async def revoke_token(self, jti, user_id, expires_at) -> None:
        self._session.add(
            RevokedTokenModel(jti=jti, user_id=user_id, expires_at=expires_at)
        )
        await self._session.flush()

    async def is_token_revoked(self, jti: str) -> bool:
        found = await self._session.scalar(
            select(RevokedTokenModel.jti).where(RevokedTokenModel.jti == jti)
        )
        return found is not None


class SqlAlchemyAccountUnitOfWork:
    def __init__(self, session: AsyncSession):
        self._session = session
        self.repo = SqlAlchemyAccountRepository(session)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
