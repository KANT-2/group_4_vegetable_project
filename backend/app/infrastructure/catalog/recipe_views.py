from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class SqlRecipeViewsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def record(self, recipe_id: str, visitor_id: UUID) -> bool:
        result = await self.session.scalar(text("""
            INSERT INTO public.recipe_view_events(recipe_id, visitor_id)
            VALUES (:recipe, :visitor) ON CONFLICT DO NOTHING RETURNING recipe_id
        """), {"recipe": recipe_id, "visitor": visitor_id})
        await self.session.commit()
        return result is not None

    async def rankings(self) -> list[dict]:
        result = await self.session.execute(text("""
            SELECT recipe_id, count(*) AS views FROM public.recipe_view_events
            WHERE viewed_at > now() - interval '24 hours'
            GROUP BY recipe_id ORDER BY views DESC, recipe_id ASC LIMIT 1000
        """))
        return [dict(row) for row in result.mappings()]
