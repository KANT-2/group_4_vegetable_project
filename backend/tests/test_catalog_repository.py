"""Run the real repository SQL against an isolated SQLite database.

PostgreSQL-only regex functions are registered locally. Locking and actual
Supabase FK/RLS are NOT certified by this test; the PostgreSQL SQL shape is
also checked below. No shared database is connected or modified.
"""
from datetime import UTC, datetime
import re
from uuid import uuid4
import pytest
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import Session
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import insert
from app.application.catalog.ports import Filters
from app.application.catalog.service import CatalogService
from app.infrastructure.catalog.models import CatalogBase, ProductModel as P, VegetableModel as V, WishlistModel as W
from app.infrastructure.catalog.repository import SqlAlchemyCatalogRepository, SqlAlchemyCatalogUnitOfWork, conditions
from app.domain.catalog.models import CatalogNotFound


class AsyncAdapter:
    def __init__(self, session):
        self.session = session
    async def execute(self, statement):
        return self.session.execute(statement)
    async def scalar(self, statement):
        return self.session.scalar(statement)
    async def scalars(self, statement):
        return self.session.scalars(statement)
    async def get(self, model, id):
        return self.session.get(model, id)
    async def flush(self):
        self.session.flush()
    async def commit(self):
        self.session.commit()
    async def rollback(self):
        self.session.rollback()


@pytest.fixture
def repo():
    engine = create_engine("sqlite:///:memory:")
    @event.listens_for(engine, "connect")
    def funcs(conn, _):
        conn.create_function("gen_random_uuid", 0, lambda: uuid4().hex)
        conn.create_function("concat", -1, lambda *args: "".join(str(x or "") for x in args))
        conn.create_function("regexp_replace", 4, lambda s, pattern, value, flags: re.sub(pattern, value, s))
        conn.create_function("substring", 2, lambda s, pattern: (m.group(1) if (m := re.search(pattern, s)) else None))
    CatalogBase.metadata.create_all(engine)
    with Session(engine, expire_on_commit=False) as session:
        session.add_all([V(id="carrot", name="당근", category="root"), V(id="apple", name="사과", category="fruit")])
        for i, price in enumerate([1000, 2000, 3000, 4000, 5000]):
            session.add(P(id=f"product-{i}", vegetable_id="carrot" if i < 4 else "apple", name=f"못난이 당근 {i}" if i < 4 else "사과", price=price, original_price=6000, unit="3kg" if i % 2 else "500g", ugly_reason="bent" if i % 2 else "small", description="상품", farm_name="좋은 농장", is_active=i != 3, is_seasonal=i % 2 == 0, is_featured=i == 0, review_count=i*10, created_at=datetime(2026, 10, i+1, tzinfo=UTC), updated_at=datetime.now(UTC)))
        session.commit()
        adapter = AsyncAdapter(session)
        yield SqlAlchemyCatalogRepository(adapter), CatalogService(SqlAlchemyCatalogUnitOfWork(adapter)), session
    engine.dispose()


async def test_real_sql_search_category_reason_and_price_filter(repo):
    r, _, _ = repo
    rows = await r.list_products(Filters(q="못 난 이", category="root", reason="small", min_price=1000, max_price=3000))
    assert [x["id"] for x in rows["items"]] == ["product-0", "product-2"]
    assert rows["total"] == 2
    assert rows["reason_counts"]["bent"] == 1
    assert (await r.list_products(Filters(q="좋은농장")))["total"] == 4
    assert (await r.list_products(Filters(q="%")))["total"] == 0
    assert (await r.list_products(Filters(q="_")))["total"] == 0
    assert (await r.list_products(Filters(q="' OR 1=1 --")))["total"] == 0


@pytest.mark.parametrize("sort, expected", [
    ("recommended", ["product-0", "product-2", "product-4", "product-1"]),
    ("price_asc", ["product-0", "product-1", "product-2", "product-4"]),
    ("price_desc", ["product-4", "product-2", "product-1", "product-0"]),
    ("newest", ["product-4", "product-2", "product-1", "product-0"]),
    ("reviews", ["product-4", "product-2", "product-1", "product-0"]),
    ("discount_desc", ["product-0", "product-1", "product-2", "product-4"]),
    ("seasonal", ["product-0", "product-2", "product-4", "product-1"]),
])
async def test_sorting_is_done_by_database(repo, sort, expected):
    assert [p["id"] for p in (await repo[0].list_products(Filters(sort=sort)))["items"]] == expected


async def test_database_pagination_is_stable_and_reason_counts_not_page_limited(repo):
    r, _, _ = repo
    first = await r.list_products(Filters(page=1, size=2, sort="price_asc"))
    second = await r.list_products(Filters(page=2, size=2, sort="price_asc"))
    assert first["total"] == second["total"] == 4
    assert len({p["id"] for p in first["items"]+second["items"]}) == 4
    assert first["reason_counts"] == second["reason_counts"]
    assert (await r.list_products(Filters(page=99)))["items"] == []


@pytest.mark.parametrize("collection, expected", [("bulk", ["product-1"]), ("single", ["product-0", "product-2", "product-4"]), ("seasonal", ["product-0", "product-2", "product-4"]), ("bigsale", ["product-0", "product-2", "product-1"])])
async def test_collection_filters(repo, collection, expected):
    assert [p["id"] for p in (await repo[0].list_products(Filters(collection=collection)))["items"]] == expected


async def test_repository_update_commits_and_is_requeryable(repo):
    r, service, session = repo
    await service.revise("product-0", price=1500, is_active=False)
    session.expire_all()
    assert await r.detail("product-0") is None
    assert (await r.detail("product-0", True))["price"] == 1500
    await service.revise("product-0", is_active=True)
    assert (await r.detail("product-0"))["price"] == 1500


async def test_version_changes_when_product_updated_or_added(repo):
    from datetime import timedelta
    r, _, session = repo
    before = await r.version()
    product = session.get(P, "product-0")
    product.updated_at = datetime.now(UTC) + timedelta(seconds=1)
    session.flush()
    assert await r.version() != before


async def test_repository_wish_unique_constraint_and_user_scoped_delete(repo):
    r, service, session = repo
    # Mirror the existing PostgreSQL UNIQUE(user_id, product_id).
    from sqlalchemy import text
    session.execute(text("create unique index wishlist_owner_product_test on wishlist_items(user_id, product_id)"))
    a, b = uuid4(), uuid4()
    for _ in range(3):
        await service.add_wish(a, "product-0")
    await service.add_wish(b, "product-0")
    assert (await r.list_wishes(a, 1, 20))["total"] == 1
    assert (await r.list_wishes(b, 1, 20))["total"] == 1
    await service.delete_wish(b, "product-0")
    assert await r.wish_ids(a) == ["product-0"]
    with pytest.raises(CatalogNotFound):
        await service.delete_wish(b, "product-0")
    assert await r.wish_ids(a) == ["product-0"]


def test_postgresql_queries_are_bound_and_wish_conflict_target_is_owner_product():
    dialect = postgresql.dialect()
    query = select(P).join(V, P.vegetable_id == V.id).where(*conditions(Filters(q="' OR 1=1 --"))).with_for_update()
    compiled = query.compile(dialect=dialect)
    assert "' OR 1=1 --" not in str(compiled)
    assert "FOR UPDATE" in str(compiled)
    wish = insert(W).values(user_id=uuid4(), product_id="product-0").on_conflict_do_nothing(index_elements=[W.user_id, W.product_id])
    assert "ON CONFLICT (user_id, product_id) DO NOTHING" in str(wish.compile(dialect=dialect))
