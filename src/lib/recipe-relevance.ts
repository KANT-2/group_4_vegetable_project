import type { Recipe } from "../types/recipe.ts";

// 편집 레시피는 주재료로 분류해 양념용 양파가 모든 요리를 차지하지 않게 해요.
// 기존 공식 데이터는 주재료 구분이 없으므로 원문 채소 연결을 유지해요.
export function recipeVegetableIds(recipe: Recipe): string[] {
  return recipe.primaryVegetableId
    ? [recipe.primaryVegetableId]
    : recipe.vegetables.map((vegetable) => vegetable.id);
}

export function mergeRecipeCatalogs(
  editorial: Recipe[],
  database: Recipe[],
): Recipe[] {
  const ids = new Set(editorial.map((recipe) => recipe.id));
  return [...editorial, ...database.filter((recipe) => !ids.has(recipe.id))];
}
