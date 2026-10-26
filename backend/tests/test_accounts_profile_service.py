from uuid import uuid4

import pytest

from app.application.accounts.profile_service import (
    AccountNotFound,
    ProfileNotFound,
    ProfileService,
)
from app.domain.accounts.models import (
    Account,
    Profile,
    ShippingAddress,
    UserRole,
)


class FakeProfileRepository:
    def __init__(self, account=None, profile=None):
        self.account = account
        self.profile = profile

    async def get_by_id(self, user_id):
        return self.account if self.account and self.account.id == user_id else None

    async def get_profile(self, user_id):
        return self.profile if self.profile and self.profile.user_id == user_id else None

    async def save_profile(self, profile):
        self.profile = profile


class FakeUnitOfWork:
    def __init__(self, repo):
        self.repo = repo
        self.commits = 0
        self.rollbacks = 0

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        self.rollbacks += 1


def make_service():
    user_id = uuid4()
    account = Account(user_id, "jina@test.com", "encoded", UserRole.USER, True)
    profile = Profile(user_id, "지나")
    uow = FakeUnitOfWork(FakeProfileRepository(account, profile))
    return ProfileService(uow), uow, user_id


def make_address():
    return ShippingAddress(
        recipient_name="김지나",
        recipient_phone="010-1234-5678",
        postal_code="12345",
        address="서울시 중구 세종대로 1",
        address_detail="101호",
    )


async def test_get_me_returns_only_requested_users_account_and_profile():
    service, _, user_id = make_service()

    result = await service.get_me(user_id)

    assert result.account.id == user_id
    assert result.profile.user_id == user_id


async def test_get_me_rejects_unknown_user():
    service, _, _ = make_service()

    with pytest.raises(AccountNotFound):
        await service.get_me(uuid4())


async def test_update_nickname_trims_and_keeps_shipping_address():
    service, uow, user_id = make_service()
    uow.repo.profile = Profile(user_id, "지나", make_address())

    updated = await service.update_nickname(user_id, "  새닉네임  ")

    assert updated.nickname == "새닉네임"
    assert updated.shipping_address == make_address()
    assert uow.commits == 1


async def test_update_shipping_address_keeps_nickname_and_normalizes_phone():
    service, uow, user_id = make_service()

    updated = await service.update_shipping_address(user_id, make_address())

    assert updated.nickname == "지나"
    assert updated.shipping_address.recipient_phone == "01012345678"
    assert uow.commits == 1


async def test_clear_shipping_address_keeps_nickname():
    service, uow, user_id = make_service()
    uow.repo.profile = Profile(user_id, "지나", make_address())

    updated = await service.clear_shipping_address(user_id)

    assert updated.nickname == "지나"
    assert updated.shipping_address is None
    assert uow.commits == 1


async def test_update_rejects_missing_profile():
    service, uow, user_id = make_service()
    uow.repo.profile = None

    with pytest.raises(ProfileNotFound):
        await service.update_nickname(user_id, "새닉네임")


@pytest.mark.parametrize(
    "changes",
    [
        {"recipient_name": "김"},
        {"recipient_phone": "1234"},
        {"postal_code": "123"},
        {"address": "짧음"},
        {"address_detail": "가" * 101},
    ],
)
def test_shipping_address_rejects_invalid_required_values(changes):
    values = {
        "recipient_name": "김지나",
        "recipient_phone": "01012345678",
        "postal_code": "12345",
        "address": "서울시 중구 세종대로 1",
        "address_detail": "101호",
    }

    with pytest.raises(ValueError):
        ShippingAddress(**(values | changes))
