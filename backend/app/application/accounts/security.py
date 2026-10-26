"""비밀번호 해싱과 JWT 처리를 담당하는 인증 핵심 로직."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from pwdlib import PasswordHash

from app.domain.accounts.models import AccessTokenPayload, UserRole

_password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    return _password_hash.verify(password, encoded)


class AccessTokenCodec:
    def __init__(self, secret_key: str, algorithm: str, expire_minutes: int):
        if not secret_key:
            raise ValueError("JWT_SECRET_KEY가 필요합니다.")
        if expire_minutes <= 0:
            raise ValueError("JWT 만료 시간은 1분 이상이어야 합니다.")
        self._secret_key = secret_key
        self._algorithm = algorithm
        self._expire_minutes = expire_minutes

    def encode(
        self, user_id: UUID, role: UserRole, now: datetime | None = None
    ) -> tuple[str, int]:
        issued_at = now or datetime.now(UTC)
        expires_in = self._expire_minutes * 60
        token = jwt.encode(
            {
                "sub": str(user_id),
                "role": role.value,
                "jti": str(uuid4()),
                "iat": issued_at,
                "exp": issued_at + timedelta(seconds=expires_in),
                "type": "access",
            },
            self._secret_key,
            algorithm=self._algorithm,
        )
        return token, expires_in

    def decode(self, token: str) -> AccessTokenPayload:
        payload = jwt.decode(
            token,
            self._secret_key,
            algorithms=[self._algorithm],
            options={"require": ["sub", "role", "jti", "exp", "type"]},
        )
        if payload["type"] != "access":
            raise jwt.InvalidTokenError("invalid token type")
        try:
            return AccessTokenPayload(
                user_id=UUID(payload["sub"]),
                role=UserRole(payload["role"]),
                jti=payload["jti"],
                expires_at=datetime.fromtimestamp(payload["exp"], tz=UTC),
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise jwt.InvalidTokenError("invalid token payload") from exc
