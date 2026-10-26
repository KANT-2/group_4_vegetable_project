from typing import Annotated, Literal
from fastapi import APIRouter, Query, Path, HTTPException, Response, Depends, File, UploadFile
from app.application.catalog.ports import Filters
from app.domain.catalog.models import CatalogConflict, CatalogNotFound, InvalidProductChange
from app.domain.catalog.reviews import MAX_IMAGE_BYTES
from app.presentation.accounts.dependencies import CurrentUser, AdminUser
from app.presentation.catalog.dependencies import Service
from app.presentation.catalog.reviews import clean_image
from app.presentation.catalog.schemas import ProductOut, ProductPage, ProductChange, ProductCreate, WishPage, Category, Reason, Sort, Collection

router = APIRouter(prefix="/catalog", tags=["catalog"])
ProductId = Annotated[str, Path(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")]


def translate(exc):
    status = 404 if isinstance(exc, CatalogNotFound) else 409 if isinstance(exc, CatalogConflict) else 422
    return HTTPException(status, str(exc))


def filters(
    page: Annotated[int, Query(ge=1, le=100000)] = 1,
    size: Annotated[int, Query(ge=1, le=100)] = 20,
    q: Annotated[str, Query(max_length=100)] = "",
    category: Category | None = None,
    reason: Reason | None = None,
    sort: Sort = "recommended",
    collection: Annotated[list[Collection] | None, Query(max_length=4)] = None,
    min_price: Annotated[int | None, Query(ge=0, le=2147483647)] = None,
    max_price: Annotated[int | None, Query(ge=0, le=2147483647)] = None,
):
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(422, "최소 가격이 최대 가격보다 클 수 없습니다.")
    # 같은 구매 옵션이 여러 번 와도 한 번으로, 순서는 고정해 같은 조건이면 같은 Filters 가 되게 한다.
    return Filters(page, size, q, category, reason, sort, tuple(sorted(set(collection or []))), min_price, max_price)


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


@router.post("/admin/products", response_model=ProductOut, status_code=201)
async def register(body: ProductCreate, service: Service, admin: AdminUser):
    try:
        return await service.register(**body.model_dump())
    except (CatalogConflict, InvalidProductChange) as exc:
        raise translate(exc) from None


@router.delete("/admin/products/{product_id}", status_code=204)
async def remove_product(product_id: ProductId, service: Service, admin: AdminUser):
    try:
        await service.delete(product_id)
    except (CatalogNotFound, CatalogConflict) as exc:
        raise translate(exc) from None
    return Response(status_code=204)


@router.put("/admin/products/{product_id}/image", response_model=ProductOut)
async def upload_image(product_id: ProductId, service: Service, admin: AdminUser, image: UploadFile = File()):
    try:
        # 다시 인코딩해 위치정보(EXIF)·이미지가 아닌 내용을 지우고 1600px 이하 JPEG 로 저장한다.
        body = clean_image(await image.read(MAX_IMAGE_BYTES + 1), image.content_type)
        return await service.set_image(product_id, body)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    except CatalogNotFound as exc:
        raise translate(exc) from None


@router.get("/products/{product_id}/image")
async def product_image(product_id: ProductId, service: Service):
    try:
        body = await service.image(product_id)
    except CatalogNotFound as exc:
        raise translate(exc) from None
    # 주소에 ?v=버전 이 붙어 바뀌므로 오래 캐시해도 된다.
    return Response(bytes(body), media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff"})


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
