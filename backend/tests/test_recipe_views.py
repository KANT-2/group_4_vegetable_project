"""Recipe analytics input validation; no shared DB required."""
from uuid import uuid4
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from app.presentation.catalog.recipe_views import router, get_service


class MemoryService:
    def __init__(self):
        self.seen = set()

    async def record(self, recipe_id, visitor_id):
        key = (recipe_id, visitor_id)
        counted = key not in self.seen
        self.seen.add(key)
        return counted

    async def rankings(self):
        return [{"recipe_id": "potato-pancake", "views": len(self.seen)}]


async def test_record_validation_and_duplicate_response():
    app = FastAPI()
    app.include_router(router)
    service = MemoryService()
    app.dependency_overrides[get_service] = lambda: service
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        body = {"recipe_id": "potato-pancake", "visitor_id": str(uuid4())}
        assert (await c.post("/recipe-views", json=body)).json() == {"counted": True}
        assert (await c.post("/recipe-views", json=body)).json() == {"counted": False}
        assert (await c.get("/recipe-views")).json()["items"][0]["views"] == 1
        for invalid in ({**body, "recipe_id": "<script>"}, {**body, "visitor_id": "invalid"}, {**body, "views": 900}):
            assert (await c.post("/recipe-views", json=invalid)).status_code == 422


@pytest.mark.skipif(__import__("os").getenv("RECIPE_VIEWS_RUN_DB_TESTS") != "1", reason="Opt-in; transaction is rolled back")
async def test_postgres_hourly_dedup_and_24_hour_window():
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.pool import NullPool
    from app.core.config import get_settings
    from app.infrastructure.catalog.recipe_views import SqlRecipeViewsRepository

    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    recipe = "views-test-" + uuid4().hex
    visitor = uuid4()
    try:
        async with engine.connect() as connection:
            outer = await connection.begin()
            try:
                async with AsyncSession(bind=connection, join_transaction_mode="create_savepoint") as session:
                    repo = SqlRecipeViewsRepository(session)
                    assert await repo.record(recipe, visitor)
                    assert not await repo.record(recipe, visitor)
                    assert await repo.record(recipe, uuid4())
                    await session.execute(text("""
                        INSERT INTO recipe_view_events(recipe_id, visitor_id, viewed_hour, viewed_at)
                        VALUES (:id, :visitor, now()-interval '25 hours', now()-interval '25 hours')
                    """), {"id": recipe, "visitor": uuid4()})
                    rows = await repo.rankings()
                    assert next(r["views"] for r in rows if r["recipe_id"] == recipe) == 2
            finally:
                await outer.rollback()
    finally:
        await engine.dispose()
