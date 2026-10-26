from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.domain.accounts.models import AccessTokenPayload, UserRole
from app.infrastructure.accounts.models import AppUserModel
from app.presentation.accounts.dependencies import get_auth_context


async def test_auth_context_uses_jwt_sub_to_load_same_app_user_id():
    user_id = uuid4()
    payload = AccessTokenPayload(
        user_id,
        UserRole.USER,
        "token-jti",
        datetime.now(UTC) + timedelta(hours=1),
    )
    session = Mock()
    session.scalar = AsyncMock(return_value=None)
    session.get = AsyncMock(
        return_value=AppUserModel(
            id=user_id,
            supabase_user_id=user_id,
            email="user@example.test",
            password_hash="encoded",
            role="user",
            is_active=True,
        )
    )

    context = await get_auth_context(payload, session)

    session.get.assert_awaited_once_with(AppUserModel, user_id)
    assert context.user.id == payload.user_id == user_id


async def test_auth_context_rejects_revoked_token_before_loading_user():
    payload = AccessTokenPayload(
        uuid4(),
        UserRole.USER,
        "revoked-jti",
        datetime.now(UTC) + timedelta(hours=1),
    )
    session = Mock()
    session.scalar = AsyncMock(return_value="revoked-jti")
    session.get = AsyncMock()

    with pytest.raises(HTTPException) as exc_info:
        await get_auth_context(payload, session)

    assert exc_info.value.status_code == 401
    session.get.assert_not_awaited()
