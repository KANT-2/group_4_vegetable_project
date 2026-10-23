"""supabase/migrations(파일명 순) 또는 seeds 를 4조 DB에 적용한다. 형준(공통) 담당.

사용: PYTHONPATH=. uv run python scripts/apply_sql.py migrations|seeds
- public 스키마에 테이블이 하나라도 있으면 중단한다(재실행·기존 DB 보호). 삭제·초기화는 하지 않는다.
- 접속 정보는 backend/.env 의 DATABASE_URL 만 사용하고 출력하지 않는다.
"""

import asyncio
import sys
from pathlib import Path

import asyncpg

from app.core.config import get_settings

ROOT = Path(__file__).resolve().parents[2] / "supabase"
SEEDS = ["catalog.sql", "recipes.sql", "verified-recipes.sql"]  # 순서 중요: 레시피는 상품 시드 이후


async def main(kind: str) -> None:
    url = get_settings().database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    conn = await asyncpg.connect(url, statement_cache_size=0)
    try:
        if kind == "migrations":
            tables = await conn.fetch("select tablename from pg_tables where schemaname = 'public'")
            if tables:
                sys.exit("public 스키마에 이미 테이블이 있어 중단합니다.")
        if kind == "seeds" and await conn.fetchval("select count(*) from public.products"):
            sys.exit("products 에 이미 데이터가 있어 시드를 중단합니다.")
        paths = (
            sorted((ROOT / "migrations").glob("*.sql"))
            if kind == "migrations"
            else [ROOT / "seeds" / name for name in SEEDS]
        )
        for path in paths:
            await conn.execute(path.read_text(encoding="utf-8"))
            print("적용:", path.name)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else "migrations"))
