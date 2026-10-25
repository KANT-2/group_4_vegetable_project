"""내 정보·프로필·기본 배송지 유스케이스."""

from uuid import UUID

from app.application.accounts.ports import AccountUnitOfWork
from app.application.accounts.read_models import MyAccount
from app.domain.accounts.models import Profile, ShippingAddress


class AccountNotFound(Exception):
    pass


class ProfileNotFound(Exception):
    pass


class ProfileService:
    def __init__(self, uow: AccountUnitOfWork):
        self._uow = uow

    async def get_me(self, user_id: UUID) -> MyAccount:
        account = await self._uow.repo.get_by_id(user_id)
        if account is None or not account.is_active:
            raise AccountNotFound("사용자 정보를 찾을 수 없습니다.")
        profile = await self._uow.repo.get_profile(user_id)
        if profile is None:
            raise ProfileNotFound("프로필을 찾을 수 없습니다.")
        return MyAccount(account, profile)

    async def update_nickname(self, user_id: UUID, nickname: str) -> Profile:
        current = await self._require_profile(user_id)
        updated = Profile(user_id, nickname, current.shipping_address)
        return await self._save(updated)

    async def update_shipping_address(
        self, user_id: UUID, address: ShippingAddress
    ) -> Profile:
        current = await self._require_profile(user_id)
        updated = Profile(user_id, current.nickname, address)
        return await self._save(updated)

    async def clear_shipping_address(self, user_id: UUID) -> Profile:
        current = await self._require_profile(user_id)
        return await self._save(Profile(user_id, current.nickname, None))

    async def _require_profile(self, user_id: UUID) -> Profile:
        profile = await self._uow.repo.get_profile(user_id)
        if profile is None:
            raise ProfileNotFound("프로필을 찾을 수 없습니다.")
        return profile

    async def _save(self, profile: Profile) -> Profile:
        try:
            await self._uow.repo.save_profile(profile)
            await self._uow.commit()
            return profile
        except Exception:
            await self._uow.rollback()
            raise
