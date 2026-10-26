"""로그인·로그아웃 유스케이스."""

from dataclasses import dataclass
from uuid import uuid4

from app.application.accounts.ports import AccountUnitOfWork
from app.application.accounts.security import AccessTokenCodec, hash_password, verify_password
from app.domain.accounts.models import AccessTokenPayload, Account, AdminRegistration, UserRole


class InvalidCredentials(Exception):
    """이메일·비밀번호가 틀렸거나 사용할 수 없는 계정이다."""


class RegistrationConflict(Exception):
    """이미 등록된 이메일 또는 관리자 아이디다."""


@dataclass(frozen=True)
class LoginResult:
    access_token: str
    token_type: str
    expires_in: int
    account: Account


class AccountService:
    def __init__(self, uow: AccountUnitOfWork, token_codec: AccessTokenCodec):
        self._uow = uow
        self._token_codec = token_codec

    async def login(self, identifier: str, password: str) -> LoginResult:
        account = await self._uow.repo.get_by_login(identifier.strip().lower())
        if (
            account is None
            or not account.is_active
            or not verify_password(password, account.password_hash)
        ):
            # 계정 존재 여부를 노출하지 않도록 실패 사유를 하나로 통일한다.
            raise InvalidCredentials("이메일 또는 비밀번호가 올바르지 않습니다.")

        token, expires_in = self._token_codec.encode(account.id, account.role)
        return LoginResult(
            access_token=token,
            token_type="bearer",
            expires_in=expires_in,
            account=account,
        )

    async def logout(self, payload: AccessTokenPayload) -> None:
        try:
            if not await self._uow.repo.is_token_revoked(payload.jti):
                await self._uow.repo.revoke_token(
                    payload.jti, payload.user_id, payload.expires_at
                )
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise

    async def register_admin(
        self, email: str, password: str, username: str, display_name: str
    ) -> AdminRegistration:
        normalized_email = email.strip().lower()
        if await self._uow.repo.get_by_email(normalized_email):
            raise RegistrationConflict("이미 사용 중인 이메일입니다.")
        existing = await self._uow.repo.get_admin_registration_by_username(username)
        if existing:
            raise RegistrationConflict("이미 사용 중인 관리자 아이디입니다.")
        user_id = uuid4()
        account = Account(
            user_id,
            normalized_email,
            hash_password(password),
            UserRole.USER,
            False,
        )
        registration = AdminRegistration(user_id, username, display_name)
        try:
            await self._uow.repo.add_admin_registration(account, registration)
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise
        return registration
