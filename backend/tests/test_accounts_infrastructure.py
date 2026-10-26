from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from app.domain.accounts.models import UserRole
from app.infrastructure.accounts.models import (
    AccountBase,
    AppUserModel,
    ProfileModel,
    RevokedTokenModel,
)
from app.infrastructure.accounts.repositories import (
    SqlAlchemyAccountRepository,
    SqlAlchemyAccountUnitOfWork,
)


def test_account_metadata_contains_expected_tables_and_foreign_key():
    assert set(AccountBase.metadata.tables) == {
        "app_users",
        "profiles",
        "revoked_tokens",
    }
    foreign_keys = {
        str(fk.column) for fk in RevokedTokenModel.__table__.c.user_id.foreign_keys
    }
    assert foreign_keys == {"app_users.id"}


async def test_profile_round_trip_maps_shipping_address():
    user_id = uuid4()
    model = ProfileModel(
        id=user_id,
        nickname="지나",
        recipient_name="김지나",
        recipient_phone="01012345678",
        postal_code="12345",
        address="서울시 중구 세종대로 1",
        address_detail="101호",
    )
    session = Mock()
    session.get = AsyncMock(return_value=model)
    repo = SqlAlchemyAccountRepository(session)

    profile = await repo.get_profile(user_id)

    assert profile.nickname == "지나"
    assert profile.shipping_address.recipient_name == "김지나"


async def test_save_profile_updates_only_requested_users_row():
    user_id = uuid4()
    model = ProfileModel(id=user_id, nickname="이전닉네임")
    session = Mock()
    session.get = AsyncMock(return_value=model)
    session.flush = AsyncMock()
    repo = SqlAlchemyAccountRepository(session)
    from app.domain.accounts.models import Profile, ShippingAddress

    shipping = ShippingAddress(
        "김지나", "01012345678", "12345", "서울시 중구 세종대로 1", "101호"
    )
    await repo.save_profile(Profile(user_id, "새닉네임", shipping))

    session.get.assert_awaited_once_with(ProfileModel, user_id)
    assert model.nickname == "새닉네임"
    assert model.recipient_phone == "01012345678"
    session.flush.assert_awaited_once()


async def test_get_by_email_maps_orm_model_to_domain_account():
    user_id = uuid4()
    session = Mock()
    session.scalar = AsyncMock(
        return_value=AppUserModel(
            id=user_id,
            email="jina@test.com",
            password_hash="encoded",
            role="admin",
            is_active=True,
        )
    )
    repo = SqlAlchemyAccountRepository(session)

    account = await repo.get_by_email("jina@test.com")

    assert account.id == user_id
    assert account.email == "jina@test.com"
    assert account.role is UserRole.ADMIN
    assert account.is_active


async def test_get_by_id_maps_orm_model_to_domain_account():
    user_id = uuid4()
    session = Mock()
    session.get = AsyncMock(
        return_value=AppUserModel(
            id=user_id,
            email="jina@test.com",
            password_hash="encoded",
            role="user",
            is_active=True,
        )
    )
    repo = SqlAlchemyAccountRepository(session)

    account = await repo.get_by_id(user_id)

    assert account.id == user_id
    assert account.role is UserRole.USER


async def test_revoke_token_adds_model_and_flushes():
    session = Mock()
    session.add = Mock()
    session.flush = AsyncMock()
    repo = SqlAlchemyAccountRepository(session)
    user_id = uuid4()
    expires_at = datetime.now(UTC) + timedelta(hours=1)

    await repo.revoke_token("token-jti", user_id, expires_at)

    model = session.add.call_args.args[0]
    assert isinstance(model, RevokedTokenModel)
    assert (model.jti, model.user_id, model.expires_at) == (
        "token-jti",
        user_id,
        expires_at,
    )
    session.flush.assert_awaited_once()


async def test_is_token_revoked_uses_jti_lookup():
    session = Mock()
    session.scalar = AsyncMock(side_effect=["token-jti", None])
    repo = SqlAlchemyAccountRepository(session)

    assert await repo.is_token_revoked("token-jti")
    assert not await repo.is_token_revoked("other-jti")


async def test_unit_of_work_delegates_commit_and_rollback():
    session = Mock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    uow = SqlAlchemyAccountUnitOfWork(session)

    await uow.commit()
    await uow.rollback()

    session.commit.assert_awaited_once()
    session.rollback.assert_awaited_once()
