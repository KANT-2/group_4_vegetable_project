"""FastAPI 진입점. 형준(공통 통합) 담당. 기능 라우터 등록은 담당자가 PR 설명에 한 줄로 요청하면 형준이 아래에 모아 반영합니다."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import database
from app.core.config import get_settings
from app.core.logging import RequestTimingMiddleware, setup_logging
from app.presentation.accounts.router import router as accounts_router
from app.presentation.experiences.errors import register_experience_error_handlers
from app.presentation.experiences.router import router as experiences_router


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
    app.include_router(accounts_router, prefix="/api/v1")   # 지나
    # app.include_router(catalog_router, prefix="/api/v1")    # 서현
    # 영우(장바구니): 구매 모듈이 아직 옛 임시 인증에 의존해서 보류. 실제 인증으로 교체한 뒤
    # app.include_router(cart_router, prefix="/api/v1") 와 register_purchase_error_handlers(app) 를 등록한다.
    app.include_router(experiences_router, prefix="/api/v1")  # 형준
    register_experience_error_handlers(app)

    return app


app = create_app()
