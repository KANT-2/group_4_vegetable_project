from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Category = Literal["root", "leaf", "fruit_veg", "mushroom", "fruit", "seasoning"]
Reason = Literal["small", "bent", "scratched", "irregular"]
Sort = Literal["recommended", "seasonal", "reviews", "newest", "price_asc", "price_desc", "discount_desc"]
Collection = Literal["seasonal", "bigsale", "bulk", "single"]


class ProductOut(BaseModel):
    id: str
    vegetable_id: str
    name: str
    price: int
    original_price: int
    unit: str
    ugly_reason: Reason
    category: Category
    description: str
    condition_note: str | None = None
    farm_name: str
    farm_region: str | None = None
    farm_story: str | None = None
    image_path: str | None = None
    is_seasonal: bool
    is_featured: bool
    is_active: bool
    tagline: str | None = None
    rating: float | None = None
    review_count: int = 0
    stock: int = Field(ge=0, description="남은 재고. 0이면 판매 중이어도 품절")
    created_at: datetime
    updated_at: datetime


class ProductPage(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    size: int
    reason_counts: dict[str, int]


Text100 = Field(default=None, min_length=1, max_length=100)


class ProductChange(BaseModel):
    """관리자 상품 수정. 보낸 칸만 바꾼다. 상품 ID는 주문 기록과 이어져 있어 바꿀 수 없다."""
    model_config = ConfigDict(extra="forbid")
    price: int | None = Field(default=None, strict=True, ge=1, le=2147483647)
    original_price: int | None = Field(default=None, strict=True, ge=1, le=2147483647)
    is_active: bool | None = Field(default=None, strict=True)
    stock: int | None = Field(default=None, strict=True, ge=0, le=1_000_000)
    name: str | None = Text100
    unit: str | None = Text100
    farm_name: str | None = Text100
    farm_region: str | None = Text100
    vegetable_id: str | None = Text100
    ugly_reason: Reason | None = None

    @model_validator(mode="after")
    def nonempty(self):
        if not self.model_fields_set or any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("수정할 가격·판매 여부·재고 중 하나가 필요합니다. null은 허용하지 않습니다.")
        return self


class ProductCreate(BaseModel):
    """관리자 상품 등록. 사진은 등록 뒤 /image 로 올린다."""
    model_config = ConfigDict(extra="forbid")
    id: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    name: str = Field(min_length=1, max_length=100)
    unit: str = Field(min_length=1, max_length=100)
    farm_name: str = Field(min_length=1, max_length=100)
    farm_region: str = Field(min_length=1, max_length=100)
    vegetable_id: str = Field(min_length=1, max_length=100)
    ugly_reason: Reason
    price: int = Field(strict=True, ge=1, le=2147483647)
    stock: int = Field(strict=True, ge=0, le=1_000_000)
    is_active: bool = Field(strict=True)


class WishOut(BaseModel):
    product_id: str
    created_at: datetime
    product: ProductOut


class WishPage(BaseModel):
    items: list[WishOut]
    total: int
    page: int
    size: int
