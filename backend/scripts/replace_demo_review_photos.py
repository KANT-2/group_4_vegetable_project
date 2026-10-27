"""Replace only the known extra-demo review images, in one transaction.

Run from backend: .venv/Scripts/python -m scripts.replace_demo_review_photos
"""

import asyncio
import hashlib
import json
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import get_settings
from app.presentation.catalog.reviews import clean_image
from scripts.demo_review_photos import render
from scripts.seed_extra_demo_reviews import REVIEWS, REVIEWERS, reviewer_id


async def main():
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    updated = 0
    try:
        async with engine.begin() as conn:
            before = (await conn.execute(text(
                "select id, user_id, product_id, rating, content, image_count, created_at, deleted_at, deletion_reason "
                "from public.product_reviews order by id"
            ))).all()
            for index, (product_id, _, _, count) in enumerate(REVIEWS):
                if not count:
                    continue
                review_id = uuid5(NAMESPACE_URL, f"motnani-demo-review-2:{index}")
                owner = reviewer_id(REVIEWERS[index % len(REVIEWERS)])
                row = (await conn.execute(text(
                    "select r.image_count, p.vegetable_id from public.product_reviews r "
                    "join public.products p on p.id = r.product_id "
                    "where r.id = :id and r.user_id = :owner and r.product_id = :product for update of r"
                ), {"id": review_id, "owner": owner, "product": product_id})).one()
                if row.image_count != count:
                    raise RuntimeError(f"Unexpected image count for {review_id}")
                body = clean_image(render(row.vegetable_id, str(review_id)), "image/jpeg")
                for position in range(count):
                    result = await conn.execute(text(
                        "update public.product_review_images set body = :body "
                        "where review_id = :id and position = :position"
                    ), {"body": body, "id": review_id, "position": position})
                    if result.rowcount != 1:
                        raise RuntimeError(f"Missing image: {review_id}/{position}")
                    saved = await conn.scalar(text(
                        "select body from public.product_review_images where review_id = :id and position = :position"
                    ), {"id": review_id, "position": position})
                    if hashlib.sha256(saved).digest() != hashlib.sha256(body).digest():
                        raise RuntimeError("Image verification failed")
                    updated += 1
            after = (await conn.execute(text(
                "select id, user_id, product_id, rating, content, image_count, created_at, deleted_at, deletion_reason "
                "from public.product_reviews order by id"
            ))).all()
            if before != after:
                raise RuntimeError("Review metadata changed during replacement")
        print(json.dumps({"updated_images": updated, "verified": True}))
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
