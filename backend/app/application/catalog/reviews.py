from typing import Protocol
from uuid import UUID
from app.domain.catalog.reviews import validate_review


class ReviewConflict(Exception):
    pass


class ReviewNotFound(Exception):
    pass


class ReviewRepository(Protocol):
    async def create(self, user_id: UUID, product_id: str, content: str, rating: int, images: list[bytes]) -> dict: ...
    async def listing(self, **filters) -> dict: ...
    async def mine(self, user_id: UUID, product_id: str) -> dict | None: ...
    async def remove(self, review_id: UUID, reason: str) -> bool: ...
    async def restore(self, review_id: UUID) -> bool: ...
    async def image(self, review_id: UUID, index: int) -> bytes | None: ...


class ReviewService:
    def __init__(self, repository: ReviewRepository):
        self.repository = repository

    async def create(self, user_id, product_id, content, rating, images):
        content = validate_review(content, rating, len(images))
        return await self.repository.create(user_id, product_id, content, rating, images)

    async def remove(self, review_id, reason):
        reason = reason.strip()
        if not reason or len(reason) > 200:
            raise ValueError("삭제 사유를 1~200자로 입력해 주세요.")
        if not await self.repository.remove(review_id, reason):
            raise ReviewNotFound()
