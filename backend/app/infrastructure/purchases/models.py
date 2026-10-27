"""장바구니 ORM 모델. 테이블은 supabase/migrations/202610080002_market_tables.sql 과 같다.

products 는 서현 님 담당 테이블이라 장바구니가 읽는 컬럼만 읽기 전용으로 매핑한다.
"""

from datetime import datetime
from uuid import UUID

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, Text, func, text
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
    stock: Mapped[int] = mapped_column(Integer, server_default=text("20"))  # DB 기본값과 같다(시연용 초기 재고)


class CartItemModel(PurchaseBase):
    __tablename__ = "cart_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True))
    product_id: Mapped[str] = mapped_column(Text)
    quantity: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrderModel(PurchaseBase):
    __tablename__ = "orders"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True))
    request_key: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True))
    status: Mapped[str] = mapped_column(Text)
    total_amount: Mapped[int] = mapped_column(BigInteger)
    recipient_name: Mapped[str] = mapped_column(Text)
    recipient_phone: Mapped[str] = mapped_column(Text)
    postal_code: Mapped[str] = mapped_column(Text)
    address: Mapped[str] = mapped_column(Text)
    address_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    payment_method: Mapped[str | None] = mapped_column(Text, nullable=True)
    shipping_fee: Mapped[int] = mapped_column(Integer, default=0)


class OrderItemModel(PurchaseBase):
    __tablename__ = "order_items"

    order_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    product_id: Mapped[str] = mapped_column(Text, primary_key=True)
    product_name: Mapped[str] = mapped_column(Text)
    product_unit: Mapped[str] = mapped_column(Text)
    unit_price: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer)


class RefundRequestModel(PurchaseBase):
    """환불 신청(접수). 테이블은 supabase/migrations/202610120002_refund_requests.sql 과 같다. 주문당 1건(order_id 가 기본키)."""

    __tablename__ = "refund_requests"

    order_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True)
    reason: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default=text("'requested'"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
