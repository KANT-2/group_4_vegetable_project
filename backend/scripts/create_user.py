"""개발용 FastAPI 사용자와 프로필을 생성한다.

사용 예시:
    python -m scripts.create_user --email jina@test.com --password "test1234!" \
        --nickname "지나"

마이그레이션 적용 후에만 실행하며 비밀번호와 DB 주소는 출력하지 않는다.
"""

import argparse
import asyncio
from pathlib import Path
import re
from uuid import uuid4

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.application.accounts.security import hash_password
from app.core.config import get_settings
from app.domain.accounts.models import UserRole
from app.infrastructure.accounts.models import AppUserModel, ProfileModel


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if len(email) > 320 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("이메일 형식이 올바르지 않습니다.")
    return email


def validate_password(value: str) -> str:
    if not 8 <= len(value) <= 128:
        raise ValueError("비밀번호는 8~128자여야 합니다.")
    return value


def normalize_nickname(value: str) -> str:
    nickname = value.strip()
    if not 2 <= len(nickname) <= 20:
        raise ValueError("닉네임은 2~20자여야 합니다.")
    return nickname


def normalize_username(value: str) -> str:
    username = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9_.-]{4,40}", username):
        raise ValueError("아이디는 영문 소문자·숫자·._- 조합의 4~40자여야 합니다.")
    return username


async def create_user(
    session: AsyncSession,
    email: str,
    password: str,
    nickname: str,
    role: UserRole = UserRole.USER,
    username: str | None = None,
) -> AppUserModel:
    normalized_email = normalize_email(email)
    validate_password(password)
    normalized_nickname = normalize_nickname(nickname)
    normalized_username = normalize_username(
        username or normalized_email.split("@", 1)[0]
    )
    user_id = uuid4()
    user = AppUserModel(
        id=user_id,
        email=normalized_email,
        username=normalized_username,
        password_hash=hash_password(password),
        role=role.value,
        is_active=True,
        supabase_user_id=user_id,
    )
    try:
        # 서비스 전체의 공통 사용자 UUID를 auth.users에서 먼저 확보한다.
        await session.execute(
            text("insert into auth.users (id, email) values (:id, :email)"),
            {"id": user_id, "email": normalized_email},
        )
        session.add(user)
        session.add(ProfileModel(id=user_id, nickname=normalized_nickname))
        await session.flush()
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    return user


def parse_args():
    parser = argparse.ArgumentParser(description="개발용 FastAPI 사용자 생성")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--nickname", required=True)
    parser.add_argument("--username")
    parser.add_argument("--role", choices=[r.value for r in UserRole], default="user")
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    # 팀 저장소는 프론트와 백엔드가 공유하는 루트 .env를 사용한다.
    load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)
    get_settings.cache_clear()
    settings = get_settings()
    if not settings.database_url:
        raise SystemExit("DATABASE_URL이 설정되지 않았습니다.")
    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as session:
            try:
                user = await create_user(
                    session,
                    args.email,
                    args.password,
                    args.nickname,
                    UserRole(args.role),
                    args.username,
                )
            except IntegrityError:
                raise SystemExit("이미 사용 중인 이메일이거나 연결 데이터가 잘못되었습니다.") from None
            print(f"created user: {user.email} ({user.role})")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
