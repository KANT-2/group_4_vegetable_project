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
    created_at: datetime
    updated_at: datetime


class ProductPage(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    size: int
    reason_counts: dict[str, int]


class ProductChange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    price: int | None = Field(default=None, strict=True, ge=1, le=2147483647)
    is_active: bool | None = Field(default=None, strict=True)

    @model_validator(mode="after")
    def nonempty(self):
        if not self.model_fields_set or any(getattr(self, key) is None for key in self.model_fields_set):
            raise ValueError("수정할 가격 또는 판매 여부가 필요합니다. null은 허용하지 않습니다.")
        return self


class WishOut(BaseModel):
    product_id: str
    created_at: datetime
    product: ProductOut


class WishPage(BaseModel):
    items: list[WishOut]
    total: int
    page: int
    size: int
