"""개발용 임시 로그인. **APP_ENV=local 일 때만 등록**되며, 지나의 로그인(JWT 발급)이 연동되면 삭제한다.

화면 E2E를 지나의 인증이 나오기 전에 시험하려는 용도다. 실제 인증이 아니므로 비밀번호 검증이 없고,
인증 연동 완료로 기록하지 않는다. 운영 환경(APP_ENV 가 local 이 아님)에서는 이 라우터 자체가 없다.
"""

from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID

import jwt
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings

DEV_USER_ID = UUID("00000000-0000-4000-8000-0000000000a1")
DEV_ADMIN_ID = UUID("00000000-0000-4000-8000-0000000000a2")

router = APIRouter(prefix="/dev", tags=["dev (local only)"])


class DevTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: UUID


@router.post("/token", response_model=DevTokenOut, summary="[개발용] 임시 토큰 발급 (로컬 전용)")
async def issue_dev_token(role: Literal["user", "admin"] = "user"):
    settings = get_settings()
    if not settings.jwt_secret_key:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "JWT_SECRET_KEY 가 설정되지 않았습니다.")
    user_id = DEV_ADMIN_ID if role == "admin" else DEV_USER_ID
    claims = {"sub": str(user_id), "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=8)}
    token = jwt.encode(claims, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return DevTokenOut(access_token=token, role=role, user_id=user_id)
