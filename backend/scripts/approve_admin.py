"""대기 중인 관리자 가입 신청을 승인한다.

가입 신청 행과 계정 권한을 한 트랜잭션에서 갱신한다. 비밀번호나 DB 주소는
출력하지 않는다.
"""

import argparse
import asyncio
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import get_settings


def parse_args():
    parser = argparse.ArgumentParser(description="관리자 가입 신청 승인")
    parser.add_argument("--username", required=True)
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    username = args.username.strip().lower()
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
                result = await session.execute(
                    text(
                        "update public.admin_registrations "
                        "set status='approved' "
                        "where lower(username)=:username and status='pending' "
                        "returning id"
                    ),
                    {"username": username},
                )
                account_id = result.scalar_one_or_none()
                if account_id is None:
                    await session.rollback()
                    raise SystemExit("대기 중인 관리자 가입 신청을 찾을 수 없습니다.")
                updated = await session.execute(
                    text(
                        "update public.app_users set role='admin', is_active=true "
                        "where id=:id returning id"
                    ),
                    {"id": account_id},
                )
                if updated.scalar_one_or_none() is None:
                    raise RuntimeError("연결된 사용자 계정을 찾을 수 없습니다.")
                await session.commit()
            except Exception:
                await session.rollback()
                raise
        print(f"approved admin: {username}")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
