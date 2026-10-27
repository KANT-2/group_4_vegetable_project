"""상품 운영 규칙. HTTP·ORM에 의존하지 않는다."""
import re
from dataclasses import dataclass

MAX_STOCK = 1_000_000  # DB 제약 products_stock_range 와 같다
MAX_PRICE = 2_147_483_647
UGLY_REASONS = ("small", "bent", "scratched", "irregular")
PRODUCT_ID = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")  # DB CHECK 와 같다


class CatalogNotFound(Exception):
    pass


class InvalidProductChange(ValueError):
    pass


class CatalogConflict(Exception):
    """이미 있는 상품 ID로 등록하거나, 주문 기록이 있는 상품을 영구 삭제하려 한다."""


def _price(value, label: str) -> int:
    if type(value) is not int or not 1 <= value <= MAX_PRICE:
        raise InvalidProductChange(f"{label}은 1~2,147,483,647원의 정수여야 합니다.")
    return value


def _text(value, label: str, max_length: int) -> str:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > max_length or "\x00" in value:
        raise InvalidProductChange(f"{label}을(를) 1~{max_length}자로 입력해 주세요.")
    return value.strip()


@dataclass
class Product:
    id: str
    price: int
    original_price: int
    is_active: bool
    stock: int = 0
    name: str = ""
    unit: str = ""
    farm_name: str = ""
    farm_region: str | None = None
    vegetable_id: str = ""
    ugly_reason: str = "irregular"

    @classmethod
    def register(cls, *, id: str, price: int, **fields) -> "Product":
        """관리자가 새 상품을 등록한다. 정상가는 판매가와 같게 시작한다."""
        if not isinstance(id, str) or len(id) > 100 or not PRODUCT_ID.fullmatch(id):
            raise InvalidProductChange("상품 ID는 영문 소문자·숫자와 하이픈(-)으로 입력해 주세요. 예: carrot-bent-1kg")
        product = cls(id=id, price=_price(price, "판매 가격"), original_price=price, is_active=True)
        for required in ("name", "unit", "farm_name", "vegetable_id", "ugly_reason", "stock", "is_active"):
            if fields.get(required) is None:
                raise InvalidProductChange("상품명·용량·농가·채소·못난이 이유·재고·판매 상태를 모두 입력해 주세요.")
        product.revise(**fields)
        return product

    def revise(
        self,
        *,
        price: int | None = None,
        original_price: int | None = None,
        is_active: bool | None = None,
        stock: int | None = None,
        name: str | None = None,
        unit: str | None = None,
        farm_name: str | None = None,
        farm_region: str | None = None,
        vegetable_id: str | None = None,
        ugly_reason: str | None = None,
    ):
        # 모두 검사한 뒤 한 번에 바꾼다: 하나라도 틀리면 상품은 그대로다.
        changes: dict = {}
        if original_price is not None:
            changes["original_price"] = _price(original_price, "정상가")
        if price is not None:
            changes["price"] = _price(price, "판매 가격")
        if changes.get("price", self.price) > changes.get("original_price", self.original_price):
            raise InvalidProductChange("판매 가격은 정상가를 초과할 수 없습니다.")
        if is_active is not None:
            if type(is_active) is not bool:
                raise InvalidProductChange("판매 여부를 확인해 주세요.")
            changes["is_active"] = is_active
        if stock is not None:
            if type(stock) is not int or not 0 <= stock <= MAX_STOCK:
                raise InvalidProductChange(f"재고는 0~{MAX_STOCK:,}개의 정수여야 합니다.")
            changes["stock"] = stock
        if name is not None:
            changes["name"] = _text(name, "상품명", 100)
        if unit is not None:
            changes["unit"] = _text(unit, "용량", 100)
        if farm_name is not None:
            changes["farm_name"] = _text(farm_name, "농가명", 100)
        if farm_region is not None:
            changes["farm_region"] = _text(farm_region, "지역", 100)
        if vegetable_id is not None:
            changes["vegetable_id"] = _text(vegetable_id, "채소", 100)
        if ugly_reason is not None:
            if ugly_reason not in UGLY_REASONS:
                raise InvalidProductChange("못난이 이유를 선택해 주세요.")
            changes["ugly_reason"] = ugly_reason
        for key, value in changes.items():
            setattr(self, key, value)
