"""장바구니 ORM 모델. 테이블은 supabase/migrations/202610080002_market_tables.sql 과 같다.

products 는 서현 님 담당 테이블이라 장바구니가 읽는 컬럼만 읽기 전용으로 매핑한다.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class PurchaseBase(DeclarativeBase):
    """다른 기능의 Base 와 섞이지 않도록 구매 전용으로 둔다."""


class ProductReadModel(PurchaseBase):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(Text)
    price: Mapped[int] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean)
    image_path: Mapped[str | None] = mapped_column(Text, nullable=True)


class CartItemModel(PurchaseBase):
    __tablename__ = "cart_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True))
    product_id: Mapped[str] = mapped_column(Text)
    quantity: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
