"""장바구니 Repository. ORM 모델 ↔ 순수 도메인 객체 변환을 여기서 담당한다."""

from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.purchases.read_models import CartLine
from app.domain.purchases.cart import MAX_QUANTITY, CartItem, InvalidQuantity, ProductInfo
from app.infrastructure.purchases.models import CartItemModel, ProductReadModel
from app.infrastructure.purchases.order_repository import SqlAlchemyOrderRepository


def _to_product(m: ProductReadModel) -> ProductInfo:
    return ProductInfo(
        id=m.id, name=m.name, unit=m.unit, price=m.price, is_active=m.is_active, image_path=m.image_path
    )


def _to_item(m: CartItemModel) -> CartItem:
    return CartItem(user_id=m.user_id, product_id=m.product_id, quantity=m.quantity)


class SqlAlchemyCartRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_product(self, product_id: str) -> ProductInfo | None:
        row = await self._session.get(ProductReadModel, product_id)
        return _to_product(row) if row else None

    async def list_lines(self, user_id: UUID) -> list[CartLine]:
        rows = await self._session.execute(
            select(CartItemModel, ProductReadModel)
            .join(ProductReadModel, ProductReadModel.id == CartItemModel.product_id)
            .where(CartItemModel.user_id == user_id)
            .order_by(CartItemModel.created_at, CartItemModel.product_id)
        )
        return [CartLine(item=_to_item(cart), product=_to_product(product)) for cart, product in rows.all()]

    async def get_item(self, user_id: UUID, product_id: str, for_update: bool = False) -> CartItem | None:
        query = select(CartItemModel).where(
            CartItemModel.user_id == user_id, CartItemModel.product_id == product_id
        )
        if for_update:
            query = query.with_for_update()
        row = (await self._session.execute(query)).scalar_one_or_none()
        return _to_item(row) if row else None

    async def add_item(self, item: CartItem) -> None:
        # 같은 상품을 동시에 담아 이미 줄이 생겼다면 오류 대신 수량을 더한다.
        statement = pg_insert(CartItemModel).values(
            user_id=item.user_id, product_id=item.product_id, quantity=item.quantity
        )
        statement = statement.on_conflict_do_update(
            index_elements=[CartItemModel.user_id, CartItemModel.product_id],
            set_={"quantity": CartItemModel.quantity + statement.excluded.quantity, "updated_at": func.now()},
        )
        try:
            await self._session.execute(statement)
            await self._session.flush()
        except IntegrityError as error:
            # 동시 요청으로 합계가 DB 제약(1~99)을 넘은 경우
            raise InvalidQuantity(f"수량은 1~{MAX_QUANTITY}개여야 합니다.") from error

    async def update_item(self, item: CartItem) -> None:
        await self._session.execute(
            update(CartItemModel)
            .where(CartItemModel.user_id == item.user_id, CartItemModel.product_id == item.product_id)
            .values(quantity=item.quantity, updated_at=func.now())
        )

    async def delete_item(self, user_id: UUID, product_id: str) -> bool:
        result = await self._session.execute(
            delete(CartItemModel).where(CartItemModel.user_id == user_id, CartItemModel.product_id == product_id)
        )
        return result.rowcount > 0


class SqlAlchemyPurchaseUnitOfWork:
    """요청 단위 AsyncSession 을 감싸 트랜잭션 경계를 응용 서비스에 노출한다."""

    def __init__(self, session: AsyncSession):
        self._session = session
        self.cart = SqlAlchemyCartRepository(session)
        self.orders = SqlAlchemyOrderRepository(session)

    async def commit(self) -> None:
        await self._session.commit()

    async def rollback(self) -> None:
        await self._session.rollback()
