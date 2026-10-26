from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest

from app.application.accounts.security import (
    AccessTokenCodec,
    hash_password,
    verify_password,
)
from app.domain.accounts.models import UserRole

SECRET = "test-secret-key-that-is-long-enough"
def make_codec(expire_minutes: int = 60) -> AccessTokenCodec:
    return AccessTokenCodec(SECRET, "HS256", expire_minutes)


def test_password_hash_is_not_plaintext_and_verifies():
    encoded = hash_password("test1234!")

    assert encoded != "test1234!"
    assert verify_password("test1234!", encoded)
    assert not verify_password("wrong-password", encoded)


def test_access_token_round_trip_contains_identity_role_and_jti():
    user_id = uuid4()
    now = datetime.now(UTC).replace(microsecond=0)
    token, expires_in = make_codec().encode(user_id, UserRole.ADMIN, now)

    payload = make_codec().decode(token)

    assert expires_in == 3600
    assert payload.user_id == user_id
    assert payload.role is UserRole.ADMIN
    assert payload.jti
    assert payload.expires_at == now + timedelta(hours=1)


def test_expired_token_is_rejected():
    now = datetime.now(UTC).replace(microsecond=0)
    token, _ = make_codec(expire_minutes=1).encode(
        uuid4(), UserRole.USER, now - timedelta(minutes=2)
    )

    with pytest.raises(jwt.ExpiredSignatureError):
        make_codec(expire_minutes=1).decode(token)


def test_tampered_token_is_rejected():
    token, _ = make_codec().encode(uuid4(), UserRole.USER)
    header, payload, signature = token.split(".")
    changed = ("A" if signature[0] != "A" else "B") + signature[1:]
    tampered = f"{header}.{payload}.{changed}"

    with pytest.raises(jwt.InvalidTokenError):
        make_codec().decode(tampered)


@pytest.mark.parametrize(
    ("secret", "minutes"),
    [("", 60), (SECRET, 0)],
)
def test_invalid_codec_configuration_is_rejected(secret, minutes):
    with pytest.raises(ValueError):
        AccessTokenCodec(secret, "HS256", minutes)
