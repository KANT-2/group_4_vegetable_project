from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.application.catalog.recipe_views import RecipeViewsService
from app.infrastructure.catalog.recipe_views import SqlRecipeViewsRepository

router = APIRouter(prefix="/recipe-views", tags=["recipe views"])


def get_service(session: Annotated[AsyncSession, Depends(get_session)]):
    return RecipeViewsService(SqlRecipeViewsRepository(session))


Service = Annotated[RecipeViewsService, Depends(get_service)]


class ViewIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recipe_id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9-]+$")
    visitor_id: UUID


@router.get("")
async def rankings(service: Service):
    return {"items": await service.rankings()}


@router.post("")
async def record(body: ViewIn, service: Service):
    return {"counted": await service.record(body.recipe_id, body.visitor_id)}
