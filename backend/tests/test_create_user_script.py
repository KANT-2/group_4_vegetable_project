from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.domain.accounts.models import UserRole
from app.infrastructure.accounts.models import AppUserModel, ProfileModel
from scripts.create_user import (
    create_user,
    normalize_email,
    normalize_nickname,
    validate_password,
)


class FakeSession:
    def __init__(self, fail_on_flush=False):
        self.added = []
        self.fail_on_flush = fail_on_flush
        self.execute = AsyncMock()
        self.flush = AsyncMock(side_effect=self._flush)
        self.commit = AsyncMock()
        self.rollback = AsyncMock()

    def add(self, value):
        self.added.append(value)

    async def _flush(self):
        if self.fail_on_flush:
            raise RuntimeError("db error")


def test_normalize_email_lowercases_and_trims():
    assert normalize_email("  JINA@Test.COM ") == "jina@test.com"


@pytest.mark.parametrize("email", ["", "not-an-email", "a@b", "a b@test.com"])
def test_invalid_email_is_rejected(email):
    with pytest.raises(ValueError):
        normalize_email(email)


@pytest.mark.parametrize("password", ["short", "x" * 129])
def test_invalid_password_length_is_rejected(password):
    with pytest.raises(ValueError):
        validate_password(password)


@pytest.mark.parametrize("nickname", ["한", "x" * 21])
def test_invalid_nickname_is_rejected(nickname):
    with pytest.raises(ValueError):
        normalize_nickname(nickname)


async def test_create_user_hashes_password_and_creates_profile():
    session = FakeSession()

    user = await create_user(
        session,
        " JINA@Test.COM ",
        "test1234!",
        "  지나  ",
        UserRole.ADMIN,
    )

    assert user.email == "jina@test.com"
    assert user.password_hash != "test1234!"
    assert user.role == "admin"
    assert user.id == user.supabase_user_id
    statement, params = session.execute.await_args.args
    assert "insert into auth.users" in str(statement).lower()
    assert params == {"id": user.id, "email": "jina@test.com"}
    assert isinstance(session.added[1], ProfileModel)
    assert session.added[1].id == user.id
    assert session.added[1].nickname == "지나"
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()


async def test_create_user_rolls_back_when_database_write_fails():
    session = FakeSession(fail_on_flush=True)

    with pytest.raises(RuntimeError):
        await create_user(session, "jina@test.com", "test1234!", "지나")

    session.commit.assert_not_awaited()
    session.rollback.assert_awaited_once()
