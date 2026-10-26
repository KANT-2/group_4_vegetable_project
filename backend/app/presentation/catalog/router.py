from typing import Annotated, Literal
from fastapi import APIRouter, Query, Path, HTTPException, Response, Depends
from app.application.catalog.ports import Filters
from app.domain.catalog.models import CatalogNotFound, InvalidProductChange
from app.presentation.accounts.dependencies import CurrentUser, AdminUser
from app.presentation.catalog.dependencies import Service
from app.presentation.catalog.schemas import ProductOut, ProductPage, ProductChange, WishPage, Category, Reason, Sort, Collection

router = APIRouter(prefix="/catalog", tags=["catalog"])
ProductId = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")]


def translate(exc):
    return HTTPException(404 if isinstance(exc, CatalogNotFound) else 422, str(exc))


def filters(
    page: Annotated[int, Query(ge=1, le=100000)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str, Query(max_length=100)] = "",
    category: Category | None = None,
    reason: Reason | None = None,
    sort: Sort = "recommended",
    collection: Collection | None = None,
    min_price: Annotated[int | None, Query(ge=0, le=2147483647)] = None,
    max_price: Annotated[int | None, Query(ge=0, le=2147483647)] = None,
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(422, "최소 가격이 최대 가격보다 클 수 없습니다.")
    return Filters(page, size, q, category, reason, sort, collection, min_price, max_price)


FilterDep = Annotated[Filters, Depends(filters)]


@router.get("/version", response_model=str)
async def version(service: Service):
    return await service.version()


@router.get("/products", response_model=ProductPage)
async def list_products(service: Service, options: FilterDep):
    return await service.list_products(options)


@router.get("/products/{product_id}", response_model=ProductOut)
async def detail(product_id: ProductId, service: Service):
    try:
        return await service.detail(product_id)
    except CatalogNotFound as exc:
        raise translate(exc) from None


@router.get("/admin/products", response_model=ProductPage)
async def admin_list(service: Service, admin: AdminUser, options: FilterDep, status: Literal["all", "active", "inactive"] = "all"):
    from dataclasses import replace
    return await service.list_products(replace(options, status=status))


@router.patch("/admin/products/{product_id}", response_model=ProductOut)
async def revise(product_id: ProductId, body: ProductChange, service: Service, admin: AdminUser):
    try:
        return await service.revise(product_id, **body.model_dump(exclude_unset=True))
    except (CatalogNotFound, InvalidProductChange) as exc:
        raise translate(exc) from None


@router.get("/wishlist/ids", response_model=list[str])
async def wish_ids(service: Service, user: CurrentUser):
    return await service.wish_ids(user.id)


@router.get("/wishlist", response_model=WishPage)
async def wishes(service: Service, user: CurrentUser, page: Annotated[int, Query(ge=1, le=100000)] = 1, size: Annotated[int, Query(ge=1, le=100)] = 20):
    return await service.list_wishes(user.id, page, size)


@router.put("/wishlist/{product_id}", status_code=204)
async def wish(product_id: ProductId, service: Service, user: CurrentUser):
    try:
        await service.add_wish(user.id, product_id)
    except CatalogNotFound as exc:
        raise translate(exc) from None
    return Response(status_code=204)


@router.delete("/wishlist/{product_id}", status_code=204)
async def unwish(product_id: ProductId, service: Service, user: CurrentUser):
    try:
        await service.delete_wish(user.id, product_id)
    except CatalogNotFound as exc:
        raise translate(exc) from None
    return Response(status_code=204)
