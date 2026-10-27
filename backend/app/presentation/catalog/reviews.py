from io import BytesIO
import warnings
from datetime import date
from typing import Annotated, Literal
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.application.catalog.reviews import ReviewConflict, ReviewNotFound, ReviewPurchaseRequired, ReviewService
from app.domain.catalog.reviews import MAX_IMAGE_BYTES, MAX_IMAGES
from app.infrastructure.catalog.reviews import SqlReviewRepository
from app.presentation.accounts.dependencies import CurrentUser, AdminUser

router = APIRouter(prefix="/catalog/reviews", tags=["reviews"])


def get_reviews(session: Annotated[AsyncSession, Depends(get_session)]):
    return ReviewService(SqlReviewRepository(session))


Service = Annotated[ReviewService, Depends(get_reviews)]
ProductId = Annotated[str, Query(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")]
Page = Annotated[int, Query(ge=1, le=10000)]
Kind = Literal["all", "images", "text"]


def clean_image(raw: bytes, mime: str | None) -> bytes:
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("사진은 한 장당 5MB 이하로 첨부해 주세요.")
    if mime not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError("JPG, PNG, WEBP 사진만 첨부할 수 있어요.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as source:
                if source.format not in {"JPEG", "PNG", "WEBP"} or source.width * source.height > 20_000_000:
                    raise ValueError("사진 크기가 너무 크거나 지원하지 않는 이미지예요.")
                source.load()
                image = ImageOps.exif_transpose(source).convert("RGB")
                image.thumbnail((1600, 1600))
                output = BytesIO()
                # Re-encoding removes EXIF/GPS and active/non-image payloads.
                image.save(output, "JPEG", quality=85)
                result = output.getvalue()
                if len(result) > MAX_IMAGE_BYTES:
                    raise ValueError("사진 크기를 줄여 다시 첨부해 주세요.")
                return result
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise ValueError("정상적인 이미지 파일을 첨부해 주세요.") from None


@router.get("")
async def listing(service: Service, product_id: ProductId, sort: Literal["newest", "oldest"] = "newest", kind: Kind = "all", page: Page = 1):
    return await service.repository.listing(product_id=product_id, sort=sort, kind=kind, page=page)


@router.get("/mine")
async def mine(service: Service, user: CurrentUser, product_id: ProductId):
    return await service.repository.mine(user.id, product_id)


@router.get("/eligibility")
async def eligibility(service: Service, user: CurrentUser, product_id: ProductId):
    return {"purchased": await service.repository.purchased(user.id, product_id)}


@router.post("", status_code=201)
async def create(service: Service, user: CurrentUser, product_id: Annotated[str, Form(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")],
                 content: Annotated[str, Form(min_length=1, max_length=1000)], rating: Annotated[int, Form(ge=1, le=5)],
                 images: Annotated[list[UploadFile] | None, File()] = None):
    uploads = images or []
    try:
        if len(uploads) > MAX_IMAGES:
            raise ValueError("리뷰 사진은 최대 3장까지 첨부할 수 있어요.")
        cleaned = []
        for upload in uploads:
            cleaned.append(clean_image(await upload.read(MAX_IMAGE_BYTES + 1), upload.content_type))
        return await service.create(user.id, product_id, content, rating, cleaned)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    except ReviewNotFound:
        raise HTTPException(404, "판매 중인 상품을 찾을 수 없어요.") from None
    except ReviewConflict:
        raise HTTPException(409, "이미 리뷰를 작성한 상품이에요.") from None
    except ReviewPurchaseRequired:
        raise HTTPException(403, "결제 완료한 주문에 포함된 상품만 후기를 작성할 수 있어요.") from None
    finally:
        for upload in uploads:
            await upload.close()


@router.get("/mine/list")
async def my_listing(service: Service, user: CurrentUser, page: Page = 1):
    return await service.repository.listing(owner_id=user.id, admin=True, status="all", page=page)


@router.get("/admin")
async def admin_listing(service: Service, admin: AdminUser, page: Page = 1, status: Literal["all", "visible", "deleted"] = "visible", q: Annotated[str, Query(max_length=100, pattern=r"^[^\x00]*$")] = "",
                        kind: Kind = "all", date_from: date | None = None, date_to: date | None = None):
    # 리뷰 종류(사진·글)와 작성 기간(한국 날짜, 양 끝 포함)으로도 거를 수 있다.
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, "시작일이 종료일보다 늦어요. 기간을 다시 골라 주세요.")
    return await service.repository.listing(admin=True, status=status, q=q.strip(), page=page, kind=kind, date_from=date_from, date_to=date_to)


class Moderation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: str = Field(min_length=1, max_length=200)


@router.delete("/admin/{review_id}", status_code=204)
async def remove(review_id: UUID, body: Moderation, service: Service, admin: AdminUser):
    try:
        await service.remove(review_id, body.reason)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    except ReviewNotFound:
        raise HTTPException(404, "공개 중인 리뷰를 찾을 수 없어요.") from None


@router.post("/admin/{review_id}/restore", status_code=204)
async def restore(review_id: UUID, service: Service, admin: AdminUser):
    if not await service.repository.restore(review_id):
        raise HTTPException(404, "삭제된 리뷰를 찾을 수 없어요.")


@router.delete("/admin/{review_id}/permanent", status_code=204)
async def purge(review_id: UUID, service: Service, admin: AdminUser):
    if not await service.repository.purge(review_id):
        raise HTTPException(404, "휴지통에서 리뷰를 찾을 수 없어요. 공개 중인 리뷰는 먼저 삭제해 휴지통으로 옮겨 주세요.")


@router.get("/{review_id}/images/{index}")
async def image(review_id: UUID, index: int, service: Service):
    if not 0 <= index < MAX_IMAGES:
        raise HTTPException(404, "사진을 찾을 수 없어요.")
    body = await service.repository.image(review_id, index)
    if body is None:
        raise HTTPException(404, "사진을 찾을 수 없어요.")
    return Response(bytes(body), media_type="image/jpeg", headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})
