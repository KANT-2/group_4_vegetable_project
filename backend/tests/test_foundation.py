import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings, get_settings
from app.main import app, lifespan


@pytest.fixture
async def client(monkeypatch):
    # 로컬 backend/.env 의 실제 DB 주소와 무관하게 '미설정' 상태로 검증한다.
    monkeypatch.setenv("DATABASE_URL", "")
    get_settings.cache_clear()
    async with lifespan(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c


async def test_health(client):
    assert (await client.get("/health")).json() == {"status": "ok"}


async def test_health_db_without_database_url(client):
    assert (await client.get("/health/db")).json() == {"db": "not_configured"}


async def test_cors_allows_frontend_origin_only(client):
    ok = await client.get("/health", headers={"Origin": "http://localhost:3000"})
    bad = await client.get("/health", headers={"Origin": "http://evil.example"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-origin" not in bad.headers


def test_database_url_must_use_asyncpg():
    with pytest.raises(ValueError):
        Settings(database_url="postgresql://u:p@h/db", _env_file=None)


def test_cors_wildcard_rejected():
    with pytest.raises(ValueError):
        _ = Settings(cors_allow_origins="*", _env_file=None).cors_origins


@pytest.fixture(autouse=True)
def _reset_settings_cache():
    yield
    get_settings.cache_clear()
