"""회원 서비스 조립과 공통 인증·권한 의존성."""

from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.accounts.security import AccessTokenCodec
from app.application.accounts.profile_service import ProfileService
from app.application.accounts.service import AccountService
from app.core.config import get_settings
from app.core.database import get_session
from app.domain.accounts.models import (
    AccessTokenPayload,
    AuthenticatedUser,
)
from app.infrastructure.accounts.repositories import (
    SqlAlchemyAccountRepository,
    SqlAlchemyAccountUnitOfWork,
)

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/accounts/login", auto_error=False
)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _token_codec() -> AccessTokenCodec:
    settings = get_settings()
    if not settings.jwt_secret_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "인증 설정이 없습니다."
        )
    return AccessTokenCodec(
        settings.jwt_secret_key,
        settings.jwt_algorithm,
        settings.jwt_access_token_expire_minutes,
    )


async def get_token_payload(
    token: str | None = Depends(oauth2_scheme),
) -> AccessTokenPayload:
    if not token:
        raise _unauthorized("로그인이 필요합니다.")
    try:
        return _token_codec().decode(token)
    except (jwt.PyJWTError, ValueError):
        raise _unauthorized("유효하지 않거나 만료된 토큰입니다.") from None


@dataclass(frozen=True)
class AuthContext:
    user: AuthenticatedUser
    payload: AccessTokenPayload


async def get_auth_context(
    payload: Annotated[AccessTokenPayload, Depends(get_token_payload)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AuthContext:
    repo = SqlAlchemyAccountRepository(session)
    if await repo.is_token_revoked(payload.jti):
        raise _unauthorized("로그아웃된 토큰입니다.")
    account = await repo.get_by_id(payload.user_id)
    if account is None or not account.is_active:
        raise _unauthorized("사용할 수 없는 계정입니다.")
    return AuthContext(
        user=AuthenticatedUser(account.id, account.role, account.is_active),
        payload=payload,
    )


async def get_current_user(
    context: Annotated[AuthContext, Depends(get_auth_context)],
) -> AuthenticatedUser:
    return context.user


async def require_admin(
    user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    if not user.is_admin:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "관리자만 사용할 수 있습니다."
        )
    return user


async def get_account_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AccountService:
    return AccountService(SqlAlchemyAccountUnitOfWork(session), _token_codec())


async def get_profile_service(
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProfileService:
    return ProfileService(SqlAlchemyAccountUnitOfWork(session))


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
AdminUser = Annotated[AuthenticatedUser, Depends(require_admin)]
CurrentAuth = Annotated[AuthContext, Depends(get_auth_context)]
AccountServiceDep = Annotated[AccountService, Depends(get_account_service)]
ProfileServiceDep = Annotated[ProfileService, Depends(get_profile_service)]
