from typing import Protocol
from uuid import UUID


class RecipeViewsRepository(Protocol):
    async def record(self, recipe_id: str, visitor_id: UUID) -> bool: ...
    async def rankings(self) -> list[dict]: ...


class RecipeViewsService:
    def __init__(self, repository: RecipeViewsRepository):
        self.repository = repository

    async def record(self, recipe_id: str, visitor_id: UUID) -> bool:
        return await self.repository.record(recipe_id, visitor_id)

    async def rankings(self) -> list[dict]:
        return await self.repository.rankings()
