"""시연용 가상 리뷰 30개(사진 리뷰 15 · 글 리뷰 15, 사진 22장)를 팀 DB에 넣는다. (2026-10-26)

    uv run python -m scripts.seed_demo_reviews            # 넣기 (다시 실행해도 중복되지 않음)
    uv run python -m scripts.seed_demo_reviews --remove   # 이 스크립트가 넣은 리뷰·가상 작성자만 지우기

- 가상 작성자 10명은 auth.users + profiles(닉네임)에만 만든다. 로그인 계정(app_users)이 없어 접속할 수 없다.
- 작성자 ID는 고정값(uuid5)이라 --remove 로 정확히 이 데이터만 지운다(리뷰·사진은 외래키 cascade).
- 사진은 public/images 의 상품 사진을 리뷰 업로드와 같은 방식(EXIF 제거·JPEG 재인코딩)으로 저장한다.
- 작성일은 오늘 기준 최근 45일 안에 흩어 두어 관리자 화면의 기간 필터를 시험할 수 있다.
"""

import asyncio
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.presentation.catalog.reviews import clean_image

IMAGES = Path(__file__).resolve().parents[2] / "public" / "images"
REVIEWERS = ["당근러버", "주말장보기", "자취생민지", "세아이맘", "건강한식탁", "요리초보준", "알뜰살림꾼", "채소덕후", "새벽배송러", "텃밭이웃"]


def reviewer_id(nickname: str):
    return uuid5(NAMESPACE_URL, f"motnani-demo-reviewer:{nickname}")


# (상품 ID, 별점, 내용, 사진 파일들) — 사진이 없으면 글 리뷰
REVIEWS = [
    ("carrot-bent-1kg", 5, "모양은 휘었는데 단맛이 진짜 좋아요. 생으로 깎아 먹어도 달아서 아이 간식으로 줬어요.", ["carrot.jpg", "carrot-scratched.jpg"]),
    ("carrot-irregular-3kg", 4, "3kg라 넉넉해서 카레, 볶음밥에 계속 쓰고 있어요. 크기가 제각각이라 손질은 조금 번거로워요.", []),
    ("carrot-scratched-2kg", 5, "흠집은 껍질에만 있고 속은 멀쩡해요. 주스 갈아 먹기 딱 좋아요.", ["carrot-bulk.jpg"]),
    ("apple-scratched-2kg", 5, "바람 자국이라더니 정말 겉만 그렇고 아삭하고 달아요. 이 가격이면 계속 살 것 같아요.", ["apple.jpg", "apple-irregular.jpg", "apple-small.jpg"]),
    ("apple-irregular-2kg", 4, "모양은 들쭉날쭉한데 맛은 마트 사과랑 차이 없어요. 몇 개는 조금 퍽퍽했어요.", []),
    ("apple-small-3kg", 5, "작아서 도시락 반찬통에 딱 들어가요. 아이들이 하나씩 들고 먹기 좋아해요.", []),
    ("shiitake-irregular-500g", 5, "향이 정말 진해요. 갓 크기는 달라도 된장찌개에 넣으니 국물이 확 살아요.", ["shiitake.jpg", "shiitake-scratched.jpg"]),
    ("shiitake-small-300g", 4, "작은 표고라 잡채에 통째로 넣기 좋았어요. 양이 조금 적은 느낌이에요.", []),
    ("cabbage-small-1ea", 5, "혼자 살아서 큰 양배추는 늘 남겼는데 이건 딱 한 번에 다 먹어요.", ["cabbage.jpg"]),
    ("cabbage-irregular-2ea", 4, "두 통이라 하나는 쌈, 하나는 볶음으로 먹었어요. 겉잎 몇 장은 떼고 먹었어요.", []),
    ("napa-cabbage-irregular-1ea", 5, "겉모양은 기울었는데 속이 꽉 차 있어요. 겉절이 했더니 고소해요.", ["napa-cabbage-irregular.jpg", "napa-cabbage-small.jpg"]),
    ("napa-cabbage-small-2ea", 4, "알배기라 쌈 싸 먹기 좋아요. 작은 편이라 김장용으로는 부족해요.", []),
    ("radish-irregular-1ea", 5, "울퉁불퉁한데 시원하고 단맛이 있어요. 뭇국 끓였더니 국물이 달아요.", ["radish.jpg"]),
    ("radish-small-2ea", 3, "작은 무라 깍두기 하기엔 손이 많이 가요. 맛은 괜찮았어요.", []),
    ("sweet-potato-bent-2kg", 5, "휘어도 꿀고구마 맞아요! 에어프라이어에 구우니 꿀이 흘러요.", ["sweet-potato.jpg", "sweet-potato-small.jpg"]),
    ("sweet-potato-small-1-5kg", 5, "한입 크기라 아이 간식으로 쪄 주기 좋아요. 재구매 의사 있어요.", []),
    ("potato-small-3kg", 4, "알감자 조림 해 먹었어요. 껍질째 먹어도 될 만큼 깨끗했어요.", ["potato-small.jpg"]),
    ("potato-irregular-5kg", 4, "양이 많아서 이웃이랑 나눴어요. 모양은 달라도 포슬포슬해요.", []),
    ("onion-small-2kg", 5, "작은 양파라 한 번 요리에 하나씩 쓰기 편해요. 매운맛이 덜하고 달아요.", ["onion.jpg"]),
    ("onion-irregular-5kg", 4, "대용량이라 장아찌 담갔어요. 몇 개는 크기가 많이 작았어요.", []),
    ("tomato-irregular-1kg", 5, "완숙이라 바로 먹기 좋아요. 모양은 제각각인데 맛은 진해요.", ["tomato.jpg", "tomato-small.jpg"]),
    ("tomato-small-1-5kg", 5, "대추방울토마토 정말 달아요. 하루 만에 반은 먹었어요.", []),
    ("paprika-irregular-4ea", 4, "색깔별로 와서 샐러드가 예뻐졌어요. 하나는 끝이 조금 물렀어요.", ["paprika.jpg"]),
    ("cucumber-bent-5ea", 4, "휘어 있어도 아삭해요. 오이무침 하기 좋았어요.", []),
    ("aehobak-small-3ea", 5, "미니 애호박이라 전 부칠 때 크기가 딱 좋아요.", ["aehobak-small.jpg"]),
    ("spinach-small-500g", 4, "섬초라 그런지 달큰해요. 잎이 작아서 다듬는 데 시간은 좀 걸려요.", []),
    ("broccoli-small-3ea", 5, "미니 브로콜리라 데쳐서 바로 먹기 편해요. 식감 좋아요.", ["broccoli-small.jpg"]),
    ("mandarin-small-3kg", 5, "소과라 껍질 까기 편하고 새콤달콤해요. 사무실 간식으로 최고예요.", []),
    ("green-onion-bent-1bunch", 4, "대파가 휘었지만 향은 그대로예요. 송송 썰어서 냉동해 두었어요.", ["green-onion.jpg"]),
    ("chili-small-300g", 3, "풋고추가 생각보다 매웠어요. 신선하긴 했어요.", []),
]


async def main() -> None:
    remove = "--remove" in sys.argv
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    ids = [reviewer_id(name) for name in REVIEWERS]
    try:
        async with engine.begin() as connection:  # 한 트랜잭션: 중간에 실패하면 아무것도 남지 않는다
            if remove:
                result = await connection.execute(
                    text("delete from auth.users where id = any(:ids)"), {"ids": ids}
                )
                print(f"가상 작성자 {result.rowcount}명과 그 리뷰·사진을 지웠어요.")
                return
            for name, user_id in zip(REVIEWERS, ids):
                email = f"demo-reviewer-{user_id.hex[:8]}@motnani.example"
                await connection.execute(
                    text("insert into auth.users (id, email) values (:id, :email) on conflict (id) do nothing"),
                    {"id": user_id, "email": email},
                )
                await connection.execute(
                    text("insert into public.profiles (id, nickname) values (:id, :name) on conflict (id) do nothing"),
                    {"id": user_id, "name": name},
                )
            now = datetime.now(UTC)
            added = images_added = 0
            for index, (product_id, rating, content, photos) in enumerate(REVIEWS):
                user_id = ids[index % len(ids)]
                # 최근 45일에 고르게 흩어 둔다(가장 최근 리뷰가 오늘).
                created = now - timedelta(days=(index * 3) % 45, hours=index * 5 % 24, minutes=index * 7)
                review_id = uuid5(NAMESPACE_URL, f"motnani-demo-review:{product_id}")
                bodies = [clean_image((IMAGES / photo).read_bytes(), "image/jpeg") for photo in photos]
                row = (
                    await connection.execute(
                        text(
                            "insert into public.product_reviews (id, user_id, product_id, rating, content, image_count, created_at) "
                            "select :id, :user, p.id, :rating, :content, :count, :created from public.products p "
                            "where p.id = :product and p.is_active "
                            "on conflict do nothing returning id"
                        ),
                        {"id": review_id, "user": user_id, "product": product_id, "rating": rating,
                         "content": content, "count": len(bodies), "created": created},
                    )
                ).first()
                if row is None:
                    continue  # 이미 넣었거나 판매 중이 아닌 상품
                added += 1
                for position, body in enumerate(bodies):
                    await connection.execute(
                        text("insert into public.product_review_images (review_id, position, body) values (:id, :pos, :body)"),
                        {"id": review_id, "pos": position, "body": body},
                    )
                    images_added += 1
            print(f"리뷰 {added}개(사진 {images_added}장)를 넣었어요. 가상 작성자 {len(ids)}명.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
