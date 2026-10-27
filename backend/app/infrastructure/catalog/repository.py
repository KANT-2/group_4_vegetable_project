from dataclasses import replace
from uuid import UUID
import time
from sqlalchemy import select, func, cast, Float, delete, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.application.catalog.ports import Filters
from app.domain.catalog.models import Product
from app.infrastructure.catalog.models import ProductModel as P, VegetableModel as V, WishlistModel as W


# 관리자가 바꿀 수 있는 칸(도메인 Product 와 같은 이름)
EDITABLE = ("name", "price", "original_price", "is_active", "stock", "unit", "farm_name", "farm_region", "vegetable_id", "ugly_reason")


def output(product: P, category: str) -> dict:
    result = {column.name: getattr(product, column.name) for column in P.__table__.columns}
    result["rating"] = float(product.rating) if product.rating is not None else None
    result["category"] = category
    return result


def conditions(f: Filters):
    terms = []
    if f.status != "all":
        terms.append(P.is_active.is_(f.status == "active"))
    if f.q.strip():
        # ILIKE patterns are escaped: '%' and '_' in input are literal characters.
        q = "".join(f.q.lower().split())
        q = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        haystack = func.regexp_replace(func.lower(func.concat(P.id, P.name, P.farm_name, func.coalesce(P.tagline, ""), V.name)), r'\s+', '', 'g')
        terms.append(haystack.like(f"%{q}%", escape="\\"))
    if f.category:
        terms.append(V.category == f.category)
    if f.reason:
        terms.append(P.ugly_reason == f.reason)
    if f.vegetable:
        terms.append(P.vegetable_id == f.vegetable)
    if f.min_price is not None:
        terms.append(P.price >= f.min_price)
    if f.max_price is not None:
        terms.append(P.price <= f.max_price)
    weight = cast(func.coalesce(func.substring(P.unit, r'([0-9]+[.]?[0-9]*)\s*kg'), "0"), Float)
    for collection in f.collection:
        if collection == "seasonal":
            terms.append(P.is_seasonal.is_(True))
        elif collection == "bigsale":
            terms.append((P.original_price - P.price) * 100 >= P.original_price * 40)
        elif collection == "bulk":
            terms.append(weight >= 3)
        elif collection == "single":
            terms.extend([P.ugly_reason == "small", weight < 3])
    return terms


def ordering(sort: str):
    discount = (P.original_price - P.price) / cast(P.original_price, Float)
    choices = {
        "recommended": [P.is_featured.desc(), P.is_seasonal.desc(), discount.desc(), P.price.asc()],
        "seasonal": [P.is_seasonal.desc(), discount.desc()],
        "reviews": [P.review_count.desc()],
        "newest": [P.created_at.desc()],
        "price_asc": [P.price.asc()],
        "price_desc": [P.price.desc()],
        "discount_desc": [discount.desc()],
    }
    return [*choices[sort], P.id.asc()]


class SqlAlchemyCatalogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def version(self):
        row = (await self.session.execute(select(func.max(P.updated_at), func.count()).select_from(P))).one()
        return f"{row[0].isoformat() if row[0] else 'empty'}:{row[1]}"

    async def list_products(self, filters: Filters):
        base = select(P, V.category).join(V, P.vegetable_id == V.id)
        terms = conditions(filters)
        total = await self.session.scalar(select(func.count()).select_from(P).join(V, P.vegetable_id == V.id).where(*terms))
        rows = await self.session.execute(base.where(*terms).order_by(*ordering(filters.sort)).offset((filters.page - 1) * filters.size).limit(filters.size))
        counts = await self.session.execute(select(P.ugly_reason, func.count()).join(V, P.vegetable_id == V.id).where(*conditions(replace(filters, reason=None))).group_by(P.ugly_reason))
        reason_counts = dict.fromkeys(("small", "bent", "scratched", "irregular"), 0)
        reason_counts.update(dict(counts.all()))
        return {"items": [output(p, c) for p, c in rows], "total": total, "page": filters.page, "size": filters.size, "reason_counts": reason_counts}

    async def detail(self, product_id: str, include_inactive=False):
        query = select(P, V.category).join(V, P.vegetable_id == V.id).where(P.id == product_id)
        if not include_inactive:
            query = query.where(P.is_active.is_(True))
        row = (await self.session.execute(query.execution_options(populate_existing=True))).first()
        return output(*row) if row else None

    async def lock_product(self, product_id: str):
        row = await self.session.scalar(select(P).where(P.id == product_id).with_for_update())
        if row is None:
            return None
        return Product(
            row.id, row.price, row.original_price, row.is_active, row.stock,
            row.name, row.unit, row.farm_name, row.farm_region, row.vegetable_id, row.ugly_reason,
        )

    async def save_product(self, product: Product):
        row = await self.session.get(P, product.id)
        for field in EDITABLE:
            setattr(row, field, getattr(product, field))
        row.updated_at = func.now()  # 카탈로그 버전이 바뀌어 고객 화면의 재고 표시도 새로 고쳐진다
        await self.session.flush()

    async def exists(self, product_id: str):
        return await self.session.scalar(select(func.count()).select_from(P).where(P.id == product_id)) > 0

    async def vegetable_exists(self, vegetable_id: str):
        return await self.session.scalar(select(func.count()).select_from(V).where(V.id == vegetable_id)) > 0

    async def add_product(self, product: Product):
        # 상품 설명·농가 이야기는 고객 화면용 문구라 등록 뒤 따로 채운다(빈 설명으로 시작).
        self.session.add(P(id=product.id, description="", is_seasonal=False, is_featured=False, review_count=0,
                           created_at=func.now(), updated_at=func.now(),
                           **{field: getattr(product, field) for field in EDITABLE}))
        await self.session.flush()

    async def is_ordered(self, product_id: str):
        return bool(await self.session.scalar(text("select exists(select 1 from public.order_items where product_id = :id)"), {"id": product_id}))

    async def delete_product(self, product_id: str):
        result = await self.session.execute(delete(P).where(P.id == product_id).returning(P.id))
        return result.scalar_one_or_none() is not None

    async def save_image(self, product_id: str, body: bytes):
        await self.session.execute(text(
            "insert into public.product_images (product_id, body) values (:id, :body) "
            "on conflict (product_id) do update set body = excluded.body, updated_at = now()"
        ), {"id": product_id, "body": body})
        # 주소에 버전을 붙여 사진을 바꾸면 브라우저가 새 사진을 받게 한다.
        row = await self.session.get(P, product_id)
        row.image_path = f"/api/product-images/{product_id}?v={int(time.time())}"
        row.updated_at = func.now()
        await self.session.flush()

    async def image(self, product_id: str):
        return await self.session.scalar(text("select body from public.product_images where product_id = :id"), {"id": product_id})

    async def list_wishes(self, user_id: UUID, page: int, size: int):
        total = await self.session.scalar(select(func.count()).select_from(W).where(W.user_id == user_id))
        rows = await self.session.execute(select(W, P, V.category).join(P, W.product_id == P.id).join(V, P.vegetable_id == V.id).where(W.user_id == user_id).order_by(W.created_at.desc(), W.product_id.asc()).offset((page-1)*size).limit(size))
        return {"items": [{"product_id": w.product_id, "created_at": w.created_at, "product": output(p, c)} for w, p, c in rows], "total": total, "page": page, "size": size}

    async def wish_ids(self, user_id: UUID):
        return list(await self.session.scalars(select(W.product_id).where(W.user_id == user_id).order_by(W.created_at.desc(), W.product_id)))

    async def add_wish(self, user_id: UUID, product_id: str):
        # Existing UNIQUE(user_id, product_id) also prevents concurrent duplicates.
        await self.session.execute(insert(W).values(user_id=user_id, product_id=product_id).on_conflict_do_nothing(index_elements=[W.user_id, W.product_id]))

    async def delete_wish(self, user_id: UUID, product_id: str):
        result = await self.session.execute(delete(W).where(W.user_id == user_id, W.product_id == product_id).returning(W.id))
        return result.scalar_one_or_none() is not None


class SqlAlchemyCatalogUnitOfWork:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = SqlAlchemyCatalogRepository(session)

    async def commit(self):
        await self.session.commit()

    async def rollback(self):
        await self.session.rollback()
