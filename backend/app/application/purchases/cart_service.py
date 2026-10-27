"""장바구니 응용 서비스. 조회 → 도메인 행위 → 저장 → 트랜잭션 완료를 조율한다. 업무 규칙 판단은 도메인에 맡긴다.

사용자는 항상 인증된 user_id 인자로만 정한다. 요청 본문·주소에서 받은 값으로 다른 사용자의 장바구니를 가리킬 수 없다.
"""

from uuid import UUID

from app.application.purchases.errors import NotFound
from app.application.purchases.ports import PurchaseUnitOfWork
from app.application.purchases.read_models import CartLine, CartView, MergeResult
from app.domain.purchases.cart import CartItem, merged_quantity, validate_quantity


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
            # 이미 담긴 수량까지 합쳐 재고를 넘는지 확인한다(장바구니에 담는다고 재고를 잡아 두지는 않는다).
            in_cart = item.quantity if item else 0
            product.ensure_stock(in_cart + quantity, in_cart)
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
            product.ensure_stock(quantity)
            item.change(quantity)
            await repo.update_item(item)
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise
        return await self._line(user_id, product_id)

    async def merge_items(self, user_id: UUID, items: list[tuple[str, int]]) -> MergeResult:
        """로그인 직후 비회원 장바구니를 한 번에 합친다. 같은 요청을 몇 번 보내도(응답 유실 후 재시도, 두 탭) 결과가 같다.

        수량은 더하지 않고 기존 수량과 비회원 수량 중 큰 값으로 맞춘다. 판매 중이고 품절이 아닌 상품만 합치고 나머지는 건너뛴다.
        모든 상품이 한 트랜잭션이라 중간에 실패하면 아무것도 반영되지 않는다.
        """
        wanted: dict[str, int] = {}
        for product_id, quantity in items:
            validate_quantity(quantity)
            # 같은 상품이 여러 번 오면 큰 수량 하나로 본다
            wanted[product_id] = merged_quantity(wanted.get(product_id), quantity)
        repo = self._uow.cart
        merged = 0
        skipped: list[str] = []
        try:
            # 상품 ID 순서로 처리해 동시에 합치는 요청끼리 잠금 순서가 같게 한다(교착 방지)
            for product_id in sorted(wanted):
                product = await repo.get_product(product_id)
                if product is None or not product.is_purchasable:
                    skipped.append(product_id)
                    continue
                # 비회원으로 담아 둔 수량이 재고보다 많으면 재고만큼만 합친다(로그인 직후라 오류 대신 줄여 준다).
                quantity = wanted[product_id] if product.stock is None else min(wanted[product_id], product.stock)
                await repo.upsert_at_least(CartItem(user_id=user_id, product_id=product_id, quantity=quantity))
                merged += 1
            await self._uow.commit()
        except Exception:
            await self._uow.rollback()
            raise
        return MergeResult(merged=merged, skipped=skipped)

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
