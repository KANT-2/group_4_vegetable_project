"""주문 API. cart_router.py 가 /api/v1/purchases 아래에 이 라우터를 붙인다(main.py 는 cart_router 한 줄만 등록한다).

로그인한 사용자 본인의 주문만 다룬다. 사용자는 토큰으로만 정하고 요청에서는 받지 않는다.
모의 결제 주문이며 실제 결제 승인으로 기록하지 않는다.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status

from app.application.purchases.order_service import OrderService
from app.presentation.purchases.dependencies import CurrentUser, get_order_service
from app.presentation.purchases.order_schemas import OrderCreate, OrderList, OrderOut, RefundCreate, RefundOut

router = APIRouter(prefix="/orders", tags=["purchases"])

Service = Annotated[OrderService, Depends(get_order_service)]
User = CurrentUser
Page = Annotated[int, Query(ge=1)]
Size = Annotated[int, Query(ge=1, le=100)]


@router.post(
    "",
    response_model=OrderOut,
    status_code=status.HTTP_201_CREATED,
    summary="모의 결제 주문 생성 (같은 request_key 재요청이면 기존 주문을 200으로 반환)",
)
async def place_order(body: OrderCreate, response: Response, service: Service, user: User):
    placed = await service.place_order(
        user.id,
        body.request_key,
        body.shipping.to_domain(),
        body.payment_method,
        body.expected_total_amount,
    )
    if not placed.created:
        response.status_code = status.HTTP_200_OK
    return OrderOut.from_view(placed.order)


@router.get("", response_model=OrderList, summary="내 주문 목록 (최신순)")
async def list_orders(
    service: Service, user: User, page: Page = 1, size: Size = 20, refunds_only: bool = False
):
    orders, total = await service.list_orders(user.id, page, size, refunds_only)
    return OrderList(items=[OrderOut.from_view(o) for o in orders], total=total, page=page, size=size)


@router.get("/{order_id}", response_model=OrderOut, summary="내 주문 상세 (남의 주문은 404)")
async def get_order(order_id: UUID, service: Service, user: User):
    return OrderOut.from_view(await service.get_order(user.id, order_id))


@router.post(
    "/{order_id}/refund",
    response_model=RefundOut,
    status_code=status.HTTP_201_CREATED,
    summary="환불 신청 접수 (주문당 1건, 다시 신청하면 처음 신청을 200으로 반환. 접수만 하며 실제 환불은 하지 않음)",
)
async def request_refund(order_id: UUID, body: RefundCreate, response: Response, service: Service, user: User):
    result = await service.request_refund(user.id, order_id, body.reason)
    if not result.created:
        response.status_code = status.HTTP_200_OK
    return RefundOut.from_view(result.refund)
