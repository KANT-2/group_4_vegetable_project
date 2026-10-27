from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.application.accounts.security import AccessTokenCodec, hash_password
from app.application.accounts.service import AccountService, InvalidCredentials
from app.domain.accounts.models import AccessTokenPayload, Account, UserRole


class FakeAccountRepository:
    def __init__(self, account: Account | None = None):
        self.account = account
        self.revoked: dict[str, tuple] = {}
        self.added_user = None
        self.added_oauth_user = None

    async def get_by_email(self, email: str) -> Account | None:
        if self.account and self.account.email == email:
            return self.account
        return None

    async def get_by_login(self, identifier: str) -> Account | None:
        if self.account and identifier in {self.account.email, "jina"}:
            return self.account
        return None

    async def get_by_id(self, user_id) -> Account | None:
        return self.account if self.account and self.account.id == user_id else None

    async def add_user(self, account, profile, username):
        self.added_user = (account, profile, username)

    async def add_oauth_user(self, account, profile):
        self.added_oauth_user = (account, profile)

    async def revoke_token(self, jti, user_id, expires_at) -> None:
        self.revoked[jti] = (user_id, expires_at)

    async def is_token_revoked(self, jti: str) -> bool:
        return jti in self.revoked


class FakeUnitOfWork:
    def __init__(self, repo: FakeAccountRepository):
        self.repo = repo
        self.commits = 0
        self.rollbacks = 0

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1


def make_account(**changes) -> Account:
    values = {
        "id": uuid4(),
        "email": "jina@test.com",
        "password_hash": hash_password("test1234!"),
        "role": UserRole.USER,
        "is_active": True,
    }
    return Account(**(values | changes))


def make_service(account: Account | None = None):
    uow = FakeUnitOfWork(FakeAccountRepository(account))
    codec = AccessTokenCodec("test-secret-key", "HS256", 60)
    return AccountService(uow, codec), uow


async def test_login_normalizes_email_and_returns_bearer_token():
    account = make_account()
    service, _ = make_service(account)

    result = await service.login("  JINA@TEST.COM ", "test1234!")

    assert result.account == account
    assert result.token_type == "bearer"
    assert result.expires_in == 3600
    assert result.access_token
    payload = service._token_codec.decode(result.access_token)
    assert payload.user_id == account.id


async def test_login_accepts_username_identifier():
    account = make_account()
    service, _ = make_service(account)

    result = await service.login(" JINA ", "test1234!")

    assert result.account == account


async def test_google_login_creates_same_uuid_account_and_profile():
    service, uow = make_service()
    user_id = uuid4()

    result = await service.login_with_google(
        user_id, " GOOGLE@EXAMPLE.TEST ", " Google 사용자 "
    )

    account, profile = uow.repo.added_oauth_user
    assert account.id == profile.user_id == user_id
    assert account.email == "google@example.test"
    assert profile.nickname == "Google 사용자"
    assert result.account == account
    assert service._token_codec.decode(result.access_token).user_id == user_id
    assert uow.commits == 1


async def test_google_login_reuses_existing_same_uuid_account():
    account = make_account(email="google@example.test")
    service, uow = make_service(account)

    result = await service.login_with_google(
        account.id, "google@example.test", "무시되는 이름"
    )

    assert result.account == account
    assert uow.repo.added_oauth_user is None
    assert uow.commits == 0


@pytest.mark.parametrize("email,password", [("none@test.com", "test1234!"), ("jina@test.com", "wrong")])
async def test_login_rejects_unknown_email_or_wrong_password(email, password):
    service, _ = make_service(make_account())

    with pytest.raises(InvalidCredentials):
        await service.login(email, password)


async def test_login_rejects_inactive_account():
    service, _ = make_service(make_account(is_active=False))

    with pytest.raises(InvalidCredentials):
        await service.login("jina@test.com", "test1234!")


async def test_logout_revokes_jti_and_commits():
    service, uow = make_service()
    user_id = uuid4()
    expires_at = datetime.now(UTC) + timedelta(hours=1)
    payload = AccessTokenPayload(user_id, UserRole.USER, "token-jti", expires_at)

    await service.logout(payload)

    assert uow.repo.revoked["token-jti"] == (user_id, expires_at)
    assert uow.commits == 1
    assert uow.rollbacks == 0


async def test_logout_is_idempotent_for_already_revoked_token():
    service, uow = make_service()
    user_id = uuid4()
    expires_at = datetime.now(UTC) + timedelta(hours=1)
    payload = AccessTokenPayload(user_id, UserRole.USER, "token-jti", expires_at)

    await service.logout(payload)
    await service.logout(payload)

    assert len(uow.repo.revoked) == 1
    assert uow.commits == 2


async def test_register_user_creates_active_account_and_profile():
    service, uow = make_service()

    account = await service.register_user(
        " NEW@EXAMPLE.TEST ", "test1234!", " New_User ", " 새싹회원 "
    )

    saved_account, profile, username = uow.repo.added_user
    assert account == saved_account
    assert account.email == "new@example.test"
    assert account.is_active
    assert username == "new_user"
    assert profile.user_id == account.id
    assert profile.nickname == "새싹회원"
    assert uow.commits == 1
