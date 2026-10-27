"""Failure response contracts without a shared database."""
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.exc import DBAPIError, TimeoutError
from app.core.error_handlers import register_common_error_handlers


@pytest.mark.parametrize("code,status", [("22003",422),("23514",422),("23503",409),("23505",409),("08006",503),("53300",503),("57P01",503),("XX000",500)])
async def test_database_failures_are_classified_without_internal_details(code, status):
    class DriverError(Exception):
        sqlstate = code
    app = FastAPI()
    register_common_error_handlers(app)
    @app.get("/failure")
    async def failure():
        raise DBAPIError("PRIVATE SQL", {"password": "SECRET"}, DriverError("PRIVATE HOST"))
    async with AsyncClient(transport=ASGITransport(app=app, raise_app_exceptions=False), base_url="http://test") as c:
        response = await c.get("/failure")
    assert response.status_code == status
    assert set(response.json()) == {"detail"}
    assert "PRIVATE" not in response.text and "SECRET" not in response.text


async def test_connection_pool_timeout_is_retryable():
    app = FastAPI()
    register_common_error_handlers(app)
    @app.get("/failure")
    async def failure():
        raise TimeoutError("private pool info")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        response = await c.get("/failure")
    assert response.status_code == 503
    assert "private" not in response.text
