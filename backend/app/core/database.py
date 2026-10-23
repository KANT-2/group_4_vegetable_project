"""비동기 DB 엔진·세션 초안. 영우 담당 제안 파일을 공통 환경 구성용으로 먼저 둔 것입니다.

영우가 이미 다른 database.py 를 작업 중이면 이 파일을 영우 버전으로 교체해도 됩니다.
엔진은 lifespan 에서 init_engine()/dispose_engine() 으로 열고 닫습니다.
"""

from collections.abc import AsyncIterator

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


async def init_engine(database_url: str) -> bool:
    """엔진을 만든다. 주소가 없으면 만들지 않고 False 를 돌려준다. 연결 자체는 아직 하지 않는다."""
    global _engine, _session_factory
    if not database_url:
        return False
    _engine = create_async_engine(database_url, pool_pre_ping=True)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return True


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


async def check_connection() -> bool:
    if _engine is None:
        return False
    async with _engine.connect() as conn:
        await conn.execute(text("select 1"))
    return True


async def get_session() -> AsyncIterator[AsyncSession]:
    """요청마다 세션 1개. 커밋·롤백은 응용 서비스가 트랜잭션 단위로 결정한다."""
    if _session_factory is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "DB가 설정되지 않았습니다.")
    async with _session_factory() as session:
        yield session
