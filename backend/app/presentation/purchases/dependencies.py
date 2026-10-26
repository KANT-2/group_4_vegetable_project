"""구매 라우터용 의존성: 서비스 조립(composition root)과 로그인 사용자.

로그인 사용자는 지금 체험 예약의 임시 어댑터를 가져다 쓴다. 지나 님의 공통 인증(get_current_user)이 develop 에 들어오면
아래 import 한 줄만 그쪽으로 바꾸면 된다. 블랙리스트(로그아웃 토큰 차단) 검사는 그쪽 구현에 달려 있다.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.purchases.cart_service import CartService
from app.core.database import get_session
from app.infrastructure.purchases.cart_repository import SqlAlchemyPurchaseUnitOfWork
from app.presentation.experiences.dependencies import CurrentUser, get_current_user  # noqa: F401  (지나 공통 인증으로 교체할 자리)


async def get_cart_service(session: AsyncSession = Depends(get_session)) -> CartService:
    return CartService(SqlAlchemyPurchaseUnitOfWork(session))
