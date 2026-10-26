"""구매 라우터용 의존성: 서비스 조립(composition root)과 로그인 사용자.

로그인 사용자는 지나 님의 공통 인증(app.presentation.accounts.dependencies)을 쓴다. 로그아웃(블랙리스트)된 토큰과
비활성 계정은 거기서 401 로 차단된다. 사용자 ID 는 JWT 의 sub(= auth.users.id 와 같은 UUID)이고, 각 API 는 이 ID 로 소유권을 검사한다.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.purchases.cart_service import CartService
from app.core.database import get_session
from app.infrastructure.purchases.cart_repository import SqlAlchemyPurchaseUnitOfWork
from app.presentation.accounts.dependencies import CurrentUser


async def get_cart_service(session: AsyncSession = Depends(get_session)) -> CartService:
    return CartService(SqlAlchemyPurchaseUnitOfWork(session))
