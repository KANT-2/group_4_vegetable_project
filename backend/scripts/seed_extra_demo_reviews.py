"""시연 리뷰 70개 추가(글 리뷰 35 · 사진 리뷰 35). 기존 seed_demo_reviews 30개와 합쳐 100개. (2026-10-27)

    uv run python -m scripts.seed_extra_demo_reviews            # 넣기 (다시 실행해도 중복되지 않음)
    uv run python -m scripts.seed_extra_demo_reviews --remove   # 이 스크립트가 넣은 리뷰·가상 작성자만 지우기

- 리뷰 내용 70개는 상품마다 따로 썼고, 기존 30개를 포함해 같은 문장이 없다.
- 사진은 public/images 상품 사진 대신 assets/demo-review-photos 의 AI 생성 실사 이미지를 쓴다.
  실제 업로드와 같은 clean_image(EXIF 제거·JPEG 재인코딩)를 거쳐 product_review_images 에 저장한다.
- 가상 작성자 14명은 auth.users + profiles 에만 만든다(로그인 계정 없음). ID 가 고정값(uuid5)이라 --remove 로 정확히 지운다.
- 예전 버전(2026-10-27 Codex)이 기존 30개 문장·사진을 재사용해 넣은 70개(작성자 3명)는 넣기 전에 지운다.
- 작성일은 최근 60일에 흩어 둔다.
"""

import asyncio
import json
import sys
from datetime import UTC, datetime, timedelta
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.presentation.catalog.reviews import clean_image
from scripts.demo_review_photos import render

REVIEWERS = ["아침샐러드", "퇴근후요리", "도시락싸는엄마", "캠핑요리왕", "제철밥상", "냉장고파먹기", "오늘도집밥",
             "채식지향", "할머니손맛", "맞벌이부부", "자취3년차", "주말브런치", "건강식단중", "김장준비중"]
LEGACY_REVIEWERS = [uuid5(NAMESPACE_URL, f"motnani-extra-demo-reviewer:{group}") for group in range(3)]


def reviewer_id(nickname: str):
    return uuid5(NAMESPACE_URL, f"motnani-demo-reviewer-2:{nickname}")


# (상품 ID, 별점, 내용, 사진 장수) — 사진 0장이면 글 리뷰
REVIEWS = [
    ("aehobak-bent-2ea", 5, "휘어 있어서 채썰기 어려울까 했는데 반달 썰기로 하니 아무 문제 없었어요. 된장찌개에 넣었더니 달큰해요.", 1),
    ("aehobak-scratched-3ea", 4, "겉에 긁힌 자국이 조금 있는데 껍질만 그래요. 세 개라 애호박전, 볶음, 국까지 알차게 썼어요.", 0),
    ("aehobak-small-3ea", 4, "작은 애호박이라 하나씩 꺼내 쓰기 편해요. 냉장고에서 일주일 넘게 두어도 단단했어요.", 2),
    ("apple-irregular-2kg", 5, "모양이 울퉁불퉁해서 깎을 때 조금 버리는 부분이 생기지만 과즙이 많고 새콤달콤해요.", 0),
    ("apple-scratched-2kg", 4, "흠집 난 부분만 도려내고 잘라 먹었어요. 아침마다 하나씩 먹기 좋은 크기예요.", 1),
    ("apple-small-3kg", 5, "소과라 껍질째 씻어서 한 입씩 베어 먹기 좋아요. 아삭함이 오래가요.", 0),
    ("broccoli-irregular-2ea", 5, "송이 모양이 한쪽으로 쏠렸는데 데쳐 놓으니 전혀 티가 안 나요. 줄기까지 달아서 볶음에 썼어요.", 2),
    ("broccoli-scratched-2ea", 4, "겉 몇 송이에 갈색 점이 있어서 잘라냈어요. 나머지는 싱싱해서 샐러드로 잘 먹었어요.", 0),
    ("broccoli-small-3ea", 5, "미니 브로콜리라 한 송이씩 통째로 데쳐서 도시락에 넣었어요. 크기가 아기자기해요.", 1),
    ("cabbage-irregular-2ea", 4, "한 통은 납작하고 한 통은 길쭉한데 속은 둘 다 꽉 찼어요. 양배추찜 해 먹었어요.", 0),
    ("cabbage-scratched-1ea", 5, "겉잎 두 장 떼어내니 속은 하얗고 깨끗해요. 코울슬로 만들었더니 아삭함이 살아 있어요.", 2),
    ("cabbage-small-1ea", 4, "작은 통이라 냉장고 칸에 쏙 들어가요. 채 썰어서 매일 아침 샐러드로 먹고 있어요.", 0),
    ("carrot-bent-1kg", 4, "두 갈래로 갈라진 당근이 섞여 와서 아이가 재밌어했어요. 볶음밥 재료로 넉넉히 썼어요.", 1),
    ("carrot-irregular-3kg", 5, "크기가 제각각이라 큰 건 카레, 작은 건 라페로 나눠 썼어요. 흙이 묻어 와서 오래 보관돼요.", 0),
    ("carrot-scratched-2kg", 4, "표면 긁힘은 필러로 한 번 밀면 없어져요. 당근 케이크 굽기에 양이 딱 맞았어요.", 2),
    ("chili-bent-500g", 5, "홍고추가 꼬불꼬불한데 색이 진하고 매콤해요. 반은 썰어서 냉동해 두었어요.", 0),
    ("chili-irregular-500g", 4, "풋고추, 홍고추가 섞여 와서 색 조합이 예뻐요. 매운 정도는 개마다 조금씩 달라요.", 1),
    ("chili-scratched-500g", 5, "청양고추 맵기가 제대로예요. 겉에 긁힌 자국은 있지만 찌개 넣는 데 아무 상관 없어요.", 0),
    ("chili-small-300g", 4, "작은 풋고추라 쌈장 찍어 먹기 딱 좋아요. 맵지 않아서 아이들도 먹었어요.", 1),
    ("cucumber-bent-5ea", 5, "구부러진 오이라 썰 때 모양은 제각각인데 아삭함은 최고예요. 오이소박이 담갔어요.", 0),
    ("cucumber-scratched-10ea", 4, "열 개라 피클 한 통 가득 담그고도 남았어요. 겉에 쓸린 자국은 껍질 벗기면 안 보여요.", 2),
    ("cucumber-small-7ea", 5, "미니 오이라 운동 끝나고 하나씩 들고 먹어요. 씨가 적고 단단해요.", 0),
    ("eggplant-irregular-5ea", 4, "굵기가 들쑥날쑥해서 굵은 건 구이, 가는 건 무침으로 했어요. 껍질 색이 선명해요.", 1),
    ("eggplant-scratched-4ea", 5, "흠집 있는 부분만 살짝 깎았어요. 가지튀김 하니 속이 촉촉하고 부드러워요.", 0),
    ("eggplant-small-7ea", 4, "작은 가지라 반 갈라서 에어프라이어에 굽기 좋아요. 일곱 개라 두 번 나눠 먹었어요.", 2),
    ("green-onion-bent-1bunch", 4, "줄기가 휘어 있어도 향이 진해요. 어슷하게 썰어서 국 끓일 때마다 한 줌씩 넣고 있어요.", 0),
    ("green-onion-irregular-2bunch", 5, "두 단이라 파김치 담그고 육개장에도 듬뿍 넣었어요. 굵기가 달라도 다 연해요.", 1),
    ("green-onion-scratched-1bunch", 4, "겉잎 몇 장은 시들어서 벗겨냈어요. 흰 부분이 길어서 대파구이 해 먹기 좋았어요.", 0),
    ("green-onion-small-1bunch", 5, "겨울 대파라 그런지 단맛이 확실히 있어요. 가늘어서 파무침에 딱이에요.", 1),
    ("king-oyster-irregular-1kg", 5, "크기가 고르지 않아도 식감이 쫄깃해요. 버터구이로 1kg 금방 다 먹었어요.", 0),
    ("king-oyster-irregular-500g", 4, "500g이라 혼자 먹기 적당해요. 길게 찢어서 장조림 했더니 고기 같았어요.", 2),
    ("king-oyster-scratched-1kg", 4, "갓 부분에 눌린 자국이 있는데 썰어 놓으면 모르겠어요. 대용량이라 반은 데쳐서 냉동했어요.", 0),
    ("king-oyster-scratched-500g", 5, "표면 긁힘만 있고 단단해요. 꼬치에 끼워 구워 먹었는데 향이 좋아요.", 1),
    ("king-oyster-small-500g", 5, "미니 새송이라 칼질 없이 통째로 볶았어요. 한입에 쏙 들어가서 반찬으로 좋아요.", 0),
    ("mandarin-irregular-3kg", 5, "크기가 들쭉날쭉한데 새콤달콤한 맛은 고르게 좋아요. 껍질이 잘 까져요.", 2),
    ("mandarin-scratched-5kg", 4, "껍질에 바람 자국이 있어서 처음엔 걱정했는데 알맹이는 멀쩡해요. 5kg라 한 달은 먹겠어요.", 0),
    ("mandarin-small-3kg", 5, "작은 귤이라 아이가 혼자 까 먹기 좋아해요. 당도가 높아서 손이 계속 가요.", 1),
    ("napa-cabbage-irregular-1ea", 4, "속이 한쪽으로 쏠려 있는데 잎이 두껍고 고소해요. 배춧국 끓였더니 시원했어요.", 0),
    ("napa-cabbage-scratched-1ea", 5, "겉잎에 상처가 있어 몇 장 떼었지만 속은 노랗게 잘 찼어요. 절여서 김치 담갔어요.", 2),
    ("napa-cabbage-small-2ea", 5, "알배기 두 통이라 하나는 쌈, 하나는 밀푀유나베 했어요. 잎이 연하고 달아요.", 0),
    ("onion-irregular-5kg", 4, "모양은 제각각인데 단단하고 무른 게 하나도 없었어요. 카레, 볶음에 쭉 쓰고 있어요.", 1),
    ("onion-scratched-3kg", 5, "겉껍질이 벗겨져서 왔는데 오히려 손질이 편했어요. 양파 캐러멜라이징 하니 정말 달아요.", 0),
    ("onion-small-2kg", 4, "작은 양파라 피클 담그기 좋았어요. 통째로 넣어도 잘 익어요.", 1),
    ("paprika-irregular-4ea", 5, "모양이 비뚤어도 과육이 두꺼워요. 생으로 썰어 먹었는데 달고 아삭해요.", 0),
    ("paprika-scratched-3ea", 4, "빨강 파프리카 세 개 중 하나에 긁힌 자국이 있었어요. 구워서 마리네이드 하니 맛있어요.", 2),
    ("paprika-small-1kg", 5, "미니 파프리카가 1kg 가득 와서 놀랐어요. 씨 빼고 크림치즈 채워 먹었어요.", 0),
    ("potato-irregular-5kg", 5, "울퉁불퉁해서 깎을 때 손이 좀 가지만 쪄 먹으니 포슬포슬해요. 감자전도 했어요.", 1),
    ("potato-scratched-2kg", 4, "긁힌 자국은 껍질에만 있어요. 수미감자라 볶음으로 해도 부서지지 않아요.", 0),
    ("potato-small-3kg", 5, "알감자로 버터 감자구이 했어요. 껍질이 얇아서 씻기만 하고 바로 요리했어요.", 2),
    ("radish-irregular-1ea", 4, "뿌리 끝이 두 갈래인데 단단하고 물이 많아요. 무생채 하니 아삭해요.", 0),
    ("radish-scratched-2ea", 5, "표면에 흠은 있지만 깎으니 하얗고 깨끗해요. 두 개라 깍두기, 뭇국 둘 다 했어요.", 1),
    ("radish-small-2ea", 4, "꼬마무라 반찬 한 번 할 양으로 딱이에요. 무조림 했더니 금방 물러지고 달았어요.", 0),
    ("shiitake-irregular-500g", 5, "갓이 찢어진 게 몇 개 있었는데 향은 정말 진해요. 표고버섯 전 부쳐 먹었어요.", 2),
    ("shiitake-scratched-1kg", 4, "화고라 갓 무늬가 예뻐요. 1kg라 일부는 말려서 육수용으로 보관했어요.", 0),
    ("shiitake-small-300g", 5, "작은 표고라 통째로 간장 조림 하기 좋아요. 쫄깃해서 아이도 잘 먹어요.", 1),
    ("spinach-irregular-1kg", 4, "1kg라 데쳐서 소분 냉동했어요. 뿌리 쪽 흙이 좀 있어서 여러 번 씻었어요.", 0),
    ("spinach-scratched-500g", 5, "잎 끝이 조금 누렇게 된 게 있었는데 다듬으니 괜찮아요. 시금치나물 달큰해요.", 2),
    ("spinach-small-500g", 4, "잎이 작아서 된장국에 그대로 넣기 좋았어요. 뿌리가 붉고 달아요.", 0),
    ("sweet-potato-bent-2kg", 4, "휘어진 고구마라 썰기는 어렵지만 오븐에 통째로 구우니 문제없어요. 촉촉해요.", 1),
    ("sweet-potato-scratched-3kg", 5, "껍질 긁힘은 있지만 속은 노랗고 달아요. 3kg라 고구마맛탕까지 해 먹었어요.", 0),
    ("sweet-potato-small-1-5kg", 5, "한입 고구마라 에어프라이어 20분이면 끝이에요. 출근길 아침으로 챙겨 가요.", 2),
    ("sweet-pumpkin-irregular-2ea", 5, "모양이 찌그러졌는데 껍질 안쪽이 진한 주황색이에요. 단호박죽 끓였더니 달아요.", 0),
    ("sweet-pumpkin-scratched-2ea", 4, "껍질 흠집 때문에 감자칼로 조금 벗겼어요. 쪄 먹으니 밤처럼 포근해요.", 1),
    ("sweet-pumpkin-small-3ea", 5, "미니 단호박이라 전자레인지에 통째로 쪄서 속에 치즈 넣어 먹었어요.", 0),
    ("tomato-irregular-1kg", 4, "모양이 각진 토마토가 섞여 있는데 과육이 단단해요. 카프레제 하기 좋았어요.", 1),
    ("tomato-scratched-2kg", 5, "주스용이라 갈아 마시기 좋아요. 몇 개는 많이 익어서 바로 소스 만들었어요.", 0),
    ("tomato-small-1-5kg", 5, "방울토마토 크기가 고르지 않지만 다 달아요. 도시락 후식으로 매일 넣어요.", 2),
    ("tomato-scratched-2kg", 4, "갈라진 토마토가 두세 개 있었는데 바로 토마토 달걀볶음 해 먹었어요. 산미가 적당해요.", 1),
    ("mandarin-scratched-5kg", 5, "두 번째 주문이에요. 이번 박스도 새콤달콤하고 무른 귤이 거의 없었어요.", 0),
    ("sweet-potato-scratched-3kg", 4, "크기가 들쭉날쭉해서 큰 건 쪄 먹고 작은 건 맛탕 했어요. 한두 개는 끝이 상해서 잘라냈어요.", 0),
]


async def main() -> None:
    remove = "--remove" in sys.argv
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    ids = [reviewer_id(name) for name in REVIEWERS]
    try:
        async with engine.begin() as conn:  # 한 트랜잭션: 중간에 실패하면 아무것도 남지 않는다
            legacy = await conn.execute(text("delete from auth.users where id = any(:ids)"), {"ids": LEGACY_REVIEWERS})
            if remove:
                result = await conn.execute(text("delete from auth.users where id = any(:ids)"), {"ids": ids})
                print(json.dumps({"removed_reviewers": result.rowcount + legacy.rowcount}))
                return
            for name, user_id in zip(REVIEWERS, ids):
                await conn.execute(text("insert into auth.users (id, email) values (:id, :email) on conflict (id) do nothing"),
                                   {"id": user_id, "email": f"demo-reviewer2-{user_id.hex[:8]}@motnani.example"})
                await conn.execute(text("insert into public.profiles (id, nickname) values (:id, :name) on conflict (id) do nothing"),
                                   {"id": user_id, "name": name})
            products = {row.id: row for row in (await conn.execute(
                text("select id, vegetable_id, ugly_reason from public.products where is_active"))).all()}
            now = datetime.now(UTC)
            added = photos = 0
            for index, (product_id, rating, content, count) in enumerate(REVIEWS):
                product = products[product_id]
                review_id = uuid5(NAMESPACE_URL, f"motnani-demo-review-2:{index}")
                created = now - timedelta(days=(index * 37) % 60, hours=(index * 5) % 24, minutes=(index * 13) % 60)
                bodies = [clean_image(render(product.vegetable_id, f"{review_id}:{n}", reason=product.ugly_reason), "image/jpeg")
                          for n in range(count)]
                row = (await conn.execute(text(
                    "insert into public.product_reviews (id, user_id, product_id, rating, content, image_count, created_at) "
                    "values (:id, :user, :product, :rating, :content, :count, :created) on conflict do nothing returning id"),
                    {"id": review_id, "user": ids[index % len(ids)], "product": product_id, "rating": rating,
                     "content": content, "count": len(bodies), "created": created})).first()
                if row is None:
                    continue  # 이미 넣었음
                added += 1
                for position, body in enumerate(bodies):
                    await conn.execute(text("insert into public.product_review_images (review_id, position, body) values (:id, :pos, :body)"),
                                       {"id": review_id, "pos": position, "body": body})
                    photos += 1
            if added not in (0, len(REVIEWS)):
                raise RuntimeError(f"{len(REVIEWS)}개 중 {added}개만 들어가 되돌립니다.")
            total = await conn.scalar(text("select count(*) from public.product_reviews"))
            print(json.dumps({"legacy_removed_reviewers": legacy.rowcount, "added": added, "photos": photos, "total_reviews": total}))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
