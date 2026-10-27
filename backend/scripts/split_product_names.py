"""상품명에 섞여 있는 산지·용량을 떼어 내 상품명만 남긴다. (2026-10-26)

예: "해남 흙당근 1kg" → 상품명 "흙당근" (산지는 farm_region, 용량은 unit 칸에 이미 따로 있다)

    uv run python -m scripts.split_product_names            # 바뀔 내용만 보여 준다(DB 변경 없음)
    uv run python -m scripts.split_product_names --sql      # 적용·되돌리기 SQL 을 만든다

DB 에는 생성된 마이그레이션(supabase/migrations/202610260006_split_product_names.sql)으로 적용한다.
"""

import asyncio
import re
import sys
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase" / "migrations" / "202610260006_split_product_names.sql"
ROLLBACK = ROOT / "backend" / "scripts" / "restore_product_names_20261026.sql"

# 끝에 붙은 용량: "1kg", "500g", "2입", "1통", "3송이", "1단", "1개" …
QUANTITY = re.compile(r"^\d+(?:\.\d+)?(?:kg|g|입|개|통|송이|단|봉|팩)$", re.IGNORECASE)
# 농가 정보에 없는 산지 이름(상품명에만 쓰인 곳)
EXTRA_PLACES = {"제주", "포항"}


def places(rows) -> set[str]:
    """농가 지역의 시·군 이름과 농가명 앞 단어(예: '해남 김씨농장' → 해남)를 산지 이름으로 본다."""
    found = set(EXTRA_PLACES)
    for row in rows:
        if row.farm_region:
            found.add(row.farm_region.split()[-1])
        found.add(row.farm_name.split()[0])
    return found


def split_name(name: str, known_places: set[str]) -> str:
    words = name.split()
    while len(words) > 1 and words[0] in known_places:
        words.pop(0)  # 앞의 산지 ("제주 한림 양배추" 처럼 두 단어일 수도 있다)
    if len(words) > 1 and QUANTITY.match(words[-1]):
        words.pop()  # 끝의 용량
    return " ".join(words)


def quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


async def main() -> None:
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    try:
        async with engine.connect() as connection:
            rows = (
                await connection.execute(text("select id, name, farm_name, farm_region from products order by id"))
            ).all()
    finally:
        await engine.dispose()
    known = places(rows)
    changes = [(row.id, row.name, split_name(row.name, known)) for row in rows]
    changes = [change for change in changes if change[1] != change[2]]
    if "--sql" not in sys.argv:
        for product_id, old, new in changes:
            print(f"{product_id:32} {old:28} → {new}")
        print(f"{len(changes)}개 바뀜 / 전체 {len(rows)}개")
        return
    header = "-- scripts/split_product_names.py 로 만든 파일. 이전 이름일 때만 바꿔서 여러 번 실행해도 안전하다.\n"
    MIGRATION.write_text(
        header
        + "-- 상품명에서 산지(farm_region 칸)·용량(unit 칸)을 떼어 내 상품명만 남긴다.\nBEGIN;\n"
        + "".join(
            f"UPDATE public.products SET name = {quote(new)}, updated_at = now() "
            f"WHERE id = {quote(pid)} AND name = {quote(old)};\n"
            for pid, old, new in changes
        )
        + "COMMIT;\n",
        encoding="utf-8",
    )
    ROLLBACK.write_text(
        header
        + "-- 되돌리기: 202610260006_split_product_names.sql 적용 전 이름으로 돌린다.\nBEGIN;\n"
        + "".join(
            f"UPDATE public.products SET name = {quote(old)}, updated_at = now() "
            f"WHERE id = {quote(pid)} AND name = {quote(new)};\n"
            for pid, old, new in changes
        )
        + "COMMIT;\n",
        encoding="utf-8",
    )
    print(f"{MIGRATION}\n{ROLLBACK}\n{len(changes)}개")


if __name__ == "__main__":
    asyncio.run(main())
