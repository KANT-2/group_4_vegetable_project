import "server-only";
import { fastApi } from "@/lib/fastapi";
import { getRecipes } from "@/services/recipes";

export type RankedRecipe = {
  id: string;
  name: string;
  imageUrl?: string;
  views: number;
};

export async function getRecipeRankings(): Promise<RankedRecipe[]> {
  const [result, recipes] = await Promise.all([
    fastApi<{ items: { recipe_id: string; views: number }[] }>(
      "/api/v1/catalog/recipe-views",
    ),
    getRecipes(),
  ]);
  const catalog = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  return result.items
    .flatMap((item) => {
      const recipe = catalog.get(item.recipe_id);
      return recipe
        ? [
            {
              id: recipe.id,
              name: recipe.name,
              imageUrl: recipe.imageUrl,
              views: item.views,
            },
          ]
        : [];
    })
    .slice(0, 3);
}
