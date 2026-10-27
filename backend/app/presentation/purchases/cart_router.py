"""구매 API 묶음. main.py 는 이 모듈의 router 한 줄만 등록하고 /api/v1 을 붙인다.

- /purchases/cart  장바구니(이 파일)
- /purchases/orders 주문(order_router.py)

장바구니 API.

로그인한 사용자 본인의 장바구니만 다룬다. 사용자는 토큰으로만 정하고 요청에서는 받지 않는다.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status

from app.application.purchases.cart_service import CartService
from app.presentation.purchases.dependencies import CurrentUser, get_cart_service
from app.presentation.purchases.order_router import router as order_router
from app.presentation.purchases.schemas import (
    CartItemCreate,
    CartItemUpdate,
    CartLineOut,
    CartMergeIn,
    CartMergeOut,
    CartOut,
)

cart = APIRouter(prefix="/cart", tags=["purchases"])

Service = Annotated[CartService, Depends(get_cart_service)]
User = CurrentUser  # 지나 님 공통 인증: Annotated[AuthenticatedUser, Depends(get_current_user)]
ProductId = Annotated[str, Path(min_length=1, max_length=100)]


@cart.get("", response_model=CartOut, summary="내 장바구니 (줄별 금액·판매 여부, 판매 중 상품만 합산)")
async def get_cart(service: Service, user: User):
    return CartOut.from_view(await service.get_cart(user.id))


@cart.post(
    "/merge",
    response_model=CartMergeOut,
    summary="비회원 장바구니 합치기 (같은 요청을 반복해도 결과가 같음: 수량은 더하지 않고 기존·비회원 중 큰 값)",
)
async def merge_cart(body: CartMergeIn, service: Service, user: User):
    result = await service.merge_items(user.id, [(line.product_id, line.quantity) for line in body.items])
    return CartMergeOut(merged=result.merged, skipped_product_ids=result.skipped)


@cart.post(
    "/items",
    response_model=CartLineOut,
    status_code=status.HTTP_201_CREATED,
    summary="상품 담기 (이미 담긴 상품이면 수량을 더함)",
)
async def add_item(body: CartItemCreate, service: Service, user: User):
    return CartLineOut.from_line(await service.add_item(user.id, body.product_id, body.quantity))


@cart.patch("/items/{product_id}", response_model=CartLineOut, summary="수량 변경")
async def change_quantity(product_id: ProductId, body: CartItemUpdate, service: Service, user: User):
    return CartLineOut.from_line(await service.change_quantity(user.id, product_id, body.quantity))


@cart.delete("/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT, summary="장바구니에서 빼기")
async def remove_item(product_id: ProductId, service: Service, user: User):
    await service.remove_item(user.id, product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


router = APIRouter(prefix="/purchases")
router.include_router(cart)
router.include_router(order_router)
