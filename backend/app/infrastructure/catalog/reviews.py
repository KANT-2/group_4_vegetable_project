"""Reviews and bounded, re-encoded images share one PostgreSQL transaction."""
from uuid import uuid4
from sqlalchemy import text
from app.application.catalog.reviews import ReviewConflict, ReviewNotFound


class SqlReviewRepository:
    def __init__(self, session):
        self.session = session

    async def create(self, user_id, product_id, content, rating, images):
        try:
            product = await self.session.scalar(text("SELECT id FROM products WHERE id=:id AND is_active FOR SHARE"), {"id": product_id})
            if not product:
                raise ReviewNotFound()
            rid = uuid4()
            result = await self.session.scalar(text("""
                INSERT INTO product_reviews(id,user_id,product_id,content,rating,image_count)
                VALUES (:id,:user,:product,:content,:rating,:count)
                ON CONFLICT (user_id,product_id) DO NOTHING RETURNING id
            """), {"id": rid, "user": user_id, "product": product_id, "content": content, "rating": rating, "count": len(images)})
            if result is None:
                raise ReviewConflict()
            for index, image in enumerate(images):
                await self.session.execute(text("INSERT INTO product_review_images(review_id,position,body) VALUES (:id,:index,:body)"), {"id": rid, "index": index, "body": image})
            await self.session.commit()
            return {"id": str(rid)}
        except Exception:
            await self.session.rollback()
            raise

    async def listing(self, product_id=None, sort="newest", kind="all", page=1, size=12, admin=False, status="visible", q="", owner_id=None):
        where = ["r.deleted_at IS NULL"] if not admin or status == "visible" else (["r.deleted_at IS NOT NULL"] if status == "deleted" else [])
        args = {"limit": size, "offset": (page - 1) * size}
        if owner_id is not None:
            where.append("r.user_id=:owner")
            args["owner"] = owner_id
        if product_id is not None:
            where.append("r.product_id=:product")
            args["product"] = product_id
        if not admin:
            where.append("p.is_active")
        if kind != "all":
            where.append("r.image_count > 0" if kind == "images" else "r.image_count = 0")
        if q:
            where.append("(r.content ILIKE :q ESCAPE '\\' OR p.name ILIKE :q ESCAPE '\\')")
            args["q"] = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        conditions = " AND ".join(where) or "TRUE"
        source = "FROM product_reviews r JOIN products p ON p.id=r.product_id LEFT JOIN profiles u ON u.id=r.user_id"
        total = await self.session.scalar(text(f"SELECT count(*) {source} WHERE {conditions}"), args)
        direction = "ASC" if sort == "oldest" else "DESC"
        rows = (await self.session.execute(text(f"""
            SELECT r.id,r.product_id,p.name AS product_name,r.rating,r.content,r.image_count,
                r.created_at,r.deleted_at,r.deletion_reason,coalesce(u.nickname,'회원') AS author
            {source} WHERE {conditions}
            ORDER BY r.created_at {direction},r.id {direction} LIMIT :limit OFFSET :offset
        """), args)).mappings().all()
        # Do not expose account UUIDs, emails, or original photo metadata.
        return {"items": [dict(row) for row in rows], "total": total, "page": page, "size": size}

    async def mine(self, user_id, product_id):
        row = (await self.session.execute(text("""
            SELECT id,content,rating,image_count,created_at,deleted_at,deletion_reason
            FROM product_reviews WHERE user_id=:user AND product_id=:product
        """), {"user": user_id, "product": product_id})).mappings().first()
        return dict(row) if row else None

    async def remove(self, review_id, reason):
        try:
            result = await self.session.scalar(text("""
                UPDATE product_reviews SET deleted_at=clock_timestamp(),deletion_reason=:reason
                WHERE id=:id AND deleted_at IS NULL RETURNING id
            """), {"id": review_id, "reason": reason})
            await self.session.commit()
            return result is not None
        except Exception:
            await self.session.rollback()
            raise

    async def restore(self, review_id):
        result = await self.session.scalar(text("UPDATE product_reviews SET deleted_at=NULL,deletion_reason=NULL WHERE id=:id AND deleted_at IS NOT NULL RETURNING id"), {"id": review_id})
        await self.session.commit()
        return result is not None

    async def image(self, review_id, index):
        return await self.session.scalar(text("""
            SELECT i.body FROM product_review_images i JOIN product_reviews r ON r.id=i.review_id
            JOIN products p ON p.id=r.product_id
            WHERE i.review_id=:id AND i.position=:index AND r.deleted_at IS NULL AND p.is_active
        """), {"id": review_id, "index": index})
