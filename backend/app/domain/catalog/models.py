"""상품 운영 규칙. HTTP·ORM에 의존하지 않는다."""
from dataclasses import dataclass


class CatalogNotFound(Exception):
    pass


class InvalidProductChange(ValueError):
    pass


@dataclass
class Product:
    id: str
    price: int
    original_price: int
    is_active: bool

    def revise(self, *, price: int | None = None, is_active: bool | None = None):
        if price is not None:
            if type(price) is not int or not 1 <= price <= 2147483647:
                raise InvalidProductChange("가격은 1~2,147,483,647원의 정수여야 합니다.")
            if price > self.original_price:
                raise InvalidProductChange("판매 가격은 정상가를 초과할 수 없습니다.")
            self.price = price
        if is_active is not None:
            if type(is_active) is not bool:
                raise InvalidProductChange("판매 여부를 확인해 주세요.")
            self.is_active = is_active
