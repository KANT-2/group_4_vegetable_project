"""체험 라우터용 의존성: 서비스 조립(composition root)과 임시 인증 어댑터.

임시 인증 어댑터: 팀이 합의 중인 토큰 규격(docs/api-contract-20261023.md §1: sub=사용자 UUID, role=user|admin)을
읽어 검증만 한다. 지나의 공통 인증(get_current_user·require_admin, 블랙리스트 검사 포함)이 develop 에 들어오면
CurrentUser·get_current_user·require_admin 만 그쪽으로 교체한다. **블랙리스트(로그아웃 토큰 차단)는 아직 검사하지 않는다.**
"""

from dataclasses import dataclass
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.experiences.service import ExperienceService
from app.core.config import get_settings
from app.core.database import get_session
from app.infrastructure.experiences.repositories import SqlAlchemyExperienceUnitOfWork

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/accounts/login", auto_error=False)


@dataclass(frozen=True)
class CurrentUser:
    id: UUID
    role: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


async def get_current_user(token: str | None = Depends(oauth2_scheme)) -> CurrentUser:
    if not token:
        raise _unauthorized("로그인이 필요합니다.")
    settings = get_settings()
    if not settings.jwt_secret_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "인증 설정이 없습니다.")
    try:
        claims = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id, role = UUID(claims["sub"]), claims.get("role", "user")
    except (jwt.PyJWTError, KeyError, ValueError):
        raise _unauthorized("유효하지 않거나 만료된 토큰입니다.") from None
    if role not in ("user", "admin"):
        raise _unauthorized("유효하지 않은 토큰입니다.")
    return CurrentUser(id=user_id, role=role)


async def require_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "관리자만 사용할 수 있습니다.")
    return user


async def get_service(session: AsyncSession = Depends(get_session)) -> ExperienceService:
    return ExperienceService(SqlAlchemyExperienceUnitOfWork(session))
