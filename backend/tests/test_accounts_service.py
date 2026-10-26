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

    async def get_by_email(self, email: str) -> Account | None:
        if self.account and self.account.email == email:
            return self.account
        return None

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
