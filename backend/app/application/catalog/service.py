from uuid import UUID
from app.application.catalog.ports import CatalogUnitOfWork, Filters
from app.domain.catalog.models import CatalogConflict, CatalogNotFound, InvalidProductChange, Product


class CatalogService:
    def __init__(self, uow: CatalogUnitOfWork):
        self.uow = uow

    async def version(self):
        return await self.uow.repo.version()

    async def list_products(self, filters: Filters):
        return await self.uow.repo.list_products(filters)

    async def detail(self, product_id: str, admin: bool = False):
        product = await self.uow.repo.detail(product_id, admin)
        if product is None:
            raise CatalogNotFound("상품을 찾을 수 없습니다.")
        return product

    async def _check_vegetable(self, vegetable_id: str | None):
        if vegetable_id is not None and not await self.uow.repo.vegetable_exists(vegetable_id):
            raise InvalidProductChange("채소 종류를 다시 선택해 주세요.")

    async def register(self, **fields):
        """관리자 상품 등록. 같은 ID가 이미 있으면(판매 중지 상품 포함) 거절한다."""
        try:
            product = Product.register(**fields)
            await self._check_vegetable(product.vegetable_id)
            if await self.uow.repo.exists(product.id):
                raise CatalogConflict("이미 등록된 상품 ID입니다. 다른 ID를 입력해 주세요.")
            await self.uow.repo.add_product(product)
            result = await self.detail(product.id, admin=True)
            await self.uow.commit()
            return result
        except Exception:
            await self.uow.rollback()
            raise

    async def delete(self, product_id: str):
        """영구 삭제. 주문 기록이 있는 상품은 주문 내역을 지키기 위해 지우지 않는다(판매 중지로 숨긴다)."""
        try:
            if await self.uow.repo.lock_product(product_id) is None:
                raise CatalogNotFound("상품을 찾을 수 없습니다.")
            if await self.uow.repo.is_ordered(product_id):
                raise CatalogConflict("주문 기록이 있는 상품은 영구 삭제할 수 없어요. 판매 중지 상태로 숨겨 둘게요.")
            await self.uow.repo.delete_product(product_id)
            await self.uow.commit()
        except Exception:
            await self.uow.rollback()
            raise

    async def set_image(self, product_id: str, body: bytes):
        try:
            if await self.uow.repo.lock_product(product_id) is None:
                raise CatalogNotFound("상품을 찾을 수 없습니다.")
            await self.uow.repo.save_image(product_id, body)
            result = await self.detail(product_id, admin=True)
            await self.uow.commit()
            return result
        except Exception:
            await self.uow.rollback()
            raise

    async def image(self, product_id: str):
        body = await self.uow.repo.image(product_id)
        if body is None:
            raise CatalogNotFound("상품 사진이 없습니다.")
        return body

    async def revise(self, product_id: str, **changes):
        try:
            product = await self.uow.repo.lock_product(product_id)
            if product is None:
                raise CatalogNotFound("상품을 찾을 수 없습니다.")
            await self._check_vegetable(changes.get("vegetable_id"))
            product.revise(**changes)
            await self.uow.repo.save_product(product)
            result = await self.detail(product_id, admin=True)
            await self.uow.commit()
            return result
        except Exception:
            await self.uow.rollback()
            raise

    async def list_wishes(self, user_id: UUID, page: int, size: int):
        return await self.uow.repo.list_wishes(user_id, page, size)

    async def wish_ids(self, user_id: UUID):
        return await self.uow.repo.wish_ids(user_id)

    async def add_wish(self, user_id: UUID, product_id: str):
        try:
            await self.detail(product_id)
            await self.uow.repo.add_wish(user_id, product_id)
            await self.uow.commit()
        except Exception:
            await self.uow.rollback()
            raise

    async def delete_wish(self, user_id: UUID, product_id: str):
        try:
            if not await self.uow.repo.delete_wish(user_id, product_id):
                raise CatalogNotFound("내 찜 목록에서 상품을 찾을 수 없습니다.")
            await self.uow.commit()
        except Exception:
            await self.uow.rollback()
            raise
