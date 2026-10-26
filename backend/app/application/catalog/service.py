from uuid import UUID
from app.application.catalog.ports import CatalogUnitOfWork, Filters
from app.domain.catalog.models import CatalogNotFound


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

    async def revise(self, product_id: str, **changes):
        try:
            product = await self.uow.repo.lock_product(product_id)
            if product is None:
                raise CatalogNotFound("상품을 찾을 수 없습니다.")
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
