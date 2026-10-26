"""장바구니 응용 서비스. 조회 → 도메인 행위 → 저장 → 트랜잭션 완료를 조율한다. 업무 규칙 판단은 도메인에 맡긴다.

사용자는 항상 인증된 user_id 인자로만 정한다. 요청 본문·주소에서 받은 값으로 다른 사용자의 장바구니를 가리킬 수 없다.
"""

from uuid import UUID

from app.application.purchases.errors import NotFound
from app.application.purchases.ports import PurchaseUnitOfWork
from app.application.purchases.read_models import CartLine, CartView
from app.domain.purchases.cart import CartItem, validate_quantity


class CartService:
    def __init__(self, uow: PurchaseUnitOfWork):
        self._uow = uow

    async def get_cart(self, user_id: UUID) -> CartView:
        return CartView(lines=await self._uow.cart.list_lines(user_id))

    async def add_item(self, user_id: UUID, product_id: str, quantity: int) -> CartLine:
        repo = self._uow.cart
        try:
            validate_quantity(quantity)
            product = await repo.get_product(product_id)
            if product is None:
                raise NotFound("상품을 찾을 수 없습니다.")
            product.ensure_purchasable()
            item = await repo.get_item(user_id, product_id, for_update=True)
            if item is None:
                await repo.add_item(CartItem(user_id=user_id, product_id=product_id, quantity=quantity))
            else:
                item.add(quantity)
                await repo.update_item(item)
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise
        return await self._line(user_id, product_id)

    async def change_quantity(self, user_id: UUID, product_id: str, quantity: int) -> CartLine:
        repo = self._uow.cart
        try:
            validate_quantity(quantity)
            item = await repo.get_item(user_id, product_id, for_update=True)
            if item is None:
                raise NotFound("장바구니에 없는 상품입니다.")
            product = await repo.get_product(product_id)
            if product is None:
                raise NotFound("상품을 찾을 수 없습니다.")
            product.ensure_purchasable()
            item.change(quantity)
            await repo.update_item(item)
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise
        return await self._line(user_id, product_id)

    async def remove_item(self, user_id: UUID, product_id: str) -> None:
        try:
            if not await self._uow.cart.delete_item(user_id, product_id):
                raise NotFound("장바구니에 없는 상품입니다.")
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise

    async def _line(self, user_id: UUID, product_id: str) -> CartLine:
        for line in await self._uow.cart.list_lines(user_id):
            if line.item.product_id == product_id:
                return line
        raise NotFound("장바구니에 없는 상품입니다.")
