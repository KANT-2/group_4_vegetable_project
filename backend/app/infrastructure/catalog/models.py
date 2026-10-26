"""기존 상품·찜 테이블 매핑. 다른 기능의 Base/모델은 변경하지 않는다."""
from datetime import datetime
from uuid import UUID
from sqlalchemy import Boolean, DateTime, Integer, Numeric, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class CatalogBase(DeclarativeBase):
    pass


class VegetableModel(CatalogBase):
    __tablename__ = "vegetables"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text)


class ProductModel(CatalogBase):
    __tablename__ = "products"
    id: Mapped[str] = mapped_column(Text, primary_key=True)
    vegetable_id: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    price: Mapped[int] = mapped_column(Integer)
    original_price: Mapped[int] = mapped_column(Integer)
    unit: Mapped[str] = mapped_column(Text)
    ugly_reason: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    condition_note: Mapped[str | None] = mapped_column(Text)
    farm_name: Mapped[str] = mapped_column(Text)
    farm_region: Mapped[str | None] = mapped_column(Text)
    farm_story: Mapped[str | None] = mapped_column(Text)
    image_path: Mapped[str | None] = mapped_column(Text)
    is_seasonal: Mapped[bool] = mapped_column(Boolean)
    is_featured: Mapped[bool] = mapped_column(Boolean)
    is_active: Mapped[bool] = mapped_column(Boolean)
    tagline: Mapped[str | None] = mapped_column(Text)
    rating: Mapped[float | None] = mapped_column(Numeric)
    review_count: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class WishlistModel(CatalogBase):
    __tablename__ = "wishlist_items"
    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True))
    product_id: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
