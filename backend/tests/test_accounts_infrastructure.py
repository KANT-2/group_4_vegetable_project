from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from app.domain.accounts.models import (
    Account,
    AdminRegistration,
    AdminRegistrationStatus,
    Profile,
    UserRole,
)
from app.infrastructure.accounts.models import (
    AccountBase,
    AdminRegistrationModel,
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
        "admin_registrations",
        "app_users",
        "profiles",
        "revoked_tokens",
    }
    foreign_keys = {
        str(fk.column) for fk in RevokedTokenModel.__table__.c.user_id.foreign_keys
    }
    assert foreign_keys == {"app_users.id"}
    admin_foreign_keys = {
        str(fk.column)
        for column in AdminRegistrationModel.__table__.c
        for fk in column.foreign_keys
    }
    # 실제 DB의 id FK는 auth.users(id)를 가리키며, auth 스키마는 이 Base 밖에서 관리한다.
    assert admin_foreign_keys == set()


def test_app_user_id_has_no_independent_uuid_default():
    assert AppUserModel.__table__.c.id.server_default is None
    assert not AppUserModel.__table__.c.supabase_user_id.nullable
    assert AppUserModel.__table__.c.supabase_user_id.unique


async def test_add_oauth_user_reuses_existing_profile():
    user_id = uuid4()
    account = Account(
        user_id,
        "google@example.test",
        "oauth-disabled",
        UserRole.USER,
        True,
    )
    profile = Profile(user_id, "Google 사용자")
    existing_profile = ProfileModel(id=user_id, nickname="기존닉네임")
    session = Mock()
    session.add = Mock()
    session.get = AsyncMock(return_value=existing_profile)
    session.flush = AsyncMock()
    repo = SqlAlchemyAccountRepository(session)

    await repo.add_oauth_user(account, profile)

    session.get.assert_awaited_once_with(ProfileModel, user_id)
    added = [call.args[0] for call in session.add.call_args_list]
    assert len(added) == 1
    assert isinstance(added[0], AppUserModel)
    assert existing_profile.nickname == "기존닉네임"
    session.flush.assert_awaited_once()


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
            supabase_user_id=user_id,
            email="jina@test.com",
            password_hash="encoded",
            role="admin",
            is_active=True,
        )
    )
    repo = SqlAlchemyAccountRepository(session)

    account = await repo.get_by_email("jina@test.com")

    assert account.id == user_id
    assert session.scalar.await_args.args[0].whereclause is not None
    assert account.email == "jina@test.com"
    assert account.role is UserRole.ADMIN
    assert account.is_active


async def test_get_by_login_queries_username_or_email_case_insensitively():
    user_id = uuid4()
    session = Mock()
    session.scalar = AsyncMock(
        return_value=AppUserModel(
            id=user_id,
            supabase_user_id=user_id,
            email="jina@test.com",
            username="jina",
            password_hash="encoded",
            role="user",
            is_active=True,
        )
    )
    repo = SqlAlchemyAccountRepository(session)

    account = await repo.get_by_login(" JINA ")

    assert account.id == user_id
    assert "lower" in str(session.scalar.await_args.args[0]).lower()


async def test_get_by_id_maps_orm_model_to_domain_account():
    user_id = uuid4()
    session = Mock()
    session.get = AsyncMock(
        return_value=AppUserModel(
            id=user_id,
            supabase_user_id=user_id,
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
    session.execute = AsyncMock()
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


async def test_add_admin_registration_saves_inactive_user_and_pending_request():
    user_id = uuid4()
    account = Account(
        user_id,
        "admin@test.com",
        "encoded",
        UserRole.USER,
        False,
    )
    registration = AdminRegistration(user_id, "NewAdmin", "관리자 신청자")
    session = Mock()
    session.add = Mock()
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    repo = SqlAlchemyAccountRepository(session)

    await repo.add_admin_registration(account, registration)

    auth_statement, auth_params = session.execute.await_args.args
    assert "insert into auth.users" in str(auth_statement).lower()
    assert auth_params == {"id": user_id, "email": "admin@test.com"}
    account_model, profile_model, registration_model = [
        call.args[0] for call in session.add.call_args_list
    ]
    assert isinstance(account_model, AppUserModel)
    assert account_model.id == account_model.supabase_user_id == user_id
    assert not account_model.is_active
    assert account_model.role == "user"
    assert isinstance(profile_model, ProfileModel)
    assert profile_model.id == user_id
    assert profile_model.nickname == "관리자 신청자"
    assert isinstance(registration_model, AdminRegistrationModel)
    assert registration_model.username == "newadmin"
    assert registration_model.email == "admin@test.com"
    assert registration_model.status == AdminRegistrationStatus.PENDING.value
    session.flush.assert_awaited_once()
