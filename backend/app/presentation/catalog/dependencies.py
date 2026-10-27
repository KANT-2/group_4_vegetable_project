from typing import Annotated
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session
from app.application.catalog.service import CatalogService
from app.infrastructure.catalog.repository import SqlAlchemyCatalogUnitOfWork


async def get_catalog_service(session: Annotated[AsyncSession, Depends(get_session)]):
    return CatalogService(SqlAlchemyCatalogUnitOfWork(session))


Service = Annotated[CatalogService, Depends(get_catalog_service)]
