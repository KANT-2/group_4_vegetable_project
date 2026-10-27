"""체험 라우터용 의존성: 서비스 조립(composition root).

인증은 지나의 공통 인증(app.presentation.accounts.dependencies)을 쓴다(router.py 참고).
로그아웃(블랙리스트)된 토큰과 비활성 계정은 거기서 401 로 차단된다.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.experiences.service import ExperienceService
from app.core.database import get_session
from app.infrastructure.experiences.repositories import SqlAlchemyExperienceUnitOfWork


async def get_service(session: AsyncSession = Depends(get_session)) -> ExperienceService:
    return ExperienceService(SqlAlchemyExperienceUnitOfWork(session))
