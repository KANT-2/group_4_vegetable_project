"""체험 라우터용 의존성: 서비스 조립(composition root).

체험 라우터 자체는 지나의 공통 인증(app.presentation.accounts.dependencies)을 쓴다(router.py 참고).
로그아웃(블랙리스트)된 토큰과 비활성 계정은 거기서 401 로 차단된다.

아래 CurrentUser·get_current_user·require_admin 은 **영우의 구매 모듈(purchases/dependencies.py)이 이 경로에서
import 하는 옛 임시 어댑터(JWT 서명만 확인, 블랙리스트 미검사)** 이다. 영우의 코드·테스트가 아직 이 규격에 의존해서
호환을 위해서만 남겼다. 영우가 import 를 app.presentation.accounts.dependencies 로 바꾸고 테스트를 실제 계정 방식으로
고치면 이 임시 어댑터는 삭제한다. 그 전까지 구매 라우터를 main.py 에 등록하지 않는다.
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
