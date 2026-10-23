"""FastAPI 진입점. 형준(공통 통합) 담당. 기능 라우터 등록은 담당자가 PR 설명에 한 줄로 요청하면 형준이 아래에 모아 반영합니다."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import database
from app.core.config import get_settings
from app.core.logging import RequestTimingMiddleware, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging()
    app.state.db_configured = await database.init_engine(settings.database_url)
    yield
    await database.dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="못난이마켓 API", lifespan=lifespan)

    app.add_middleware(RequestTimingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/health/db")
    async def health_db():
        try:
            connected = await database.check_connection()
        except Exception:
            # 오류 본문에는 접속 정보가 섞일 수 있어 종류만 알린다.
            return {"db": "error"}
        return {"db": "ok" if connected else "not_configured"}

    # 기능 라우터 등록 자리 (형준이 모아서 반영, prefix 는 /api/v1/<기능>)
    # app.include_router(accounts_router, prefix="/api/v1")   # 지나
    # app.include_router(catalog_router, prefix="/api/v1")    # 서현
    # app.include_router(purchases_router, prefix="/api/v1")  # 영우
    # app.include_router(experiences_router, prefix="/api/v1")  # 형준

    return app


app = create_app()
