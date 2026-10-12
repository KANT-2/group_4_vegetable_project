import type { Recipe } from "../types/recipe.ts";
import { withRecipePhoto } from "./recipe-photos.ts";
import type { Product } from "../types/product.ts";
import type { Vegetable } from "../types/vegetable.ts";

export interface CatalogRecipe {
  id: string;
  name: string;
  description: string;
  cookTimeMin: number | null;
  difficulty: Recipe["difficulty"];
  servings: number | null;
  ingredients: Recipe["ingredients"];
  steps: string[];
  vegetables: { id: string; name: string }[];
  productVegetableIds: string[];
  sourceUrl: string;
  sourceName: string;
}

export function connectCatalogRecipes(
  catalog: CatalogRecipe[],
  products: Product[],
  vegetables: Vegetable[],
): Recipe[] {
  return catalog.map(({ productVegetableIds, servings, ...recipe }) =>
    withRecipePhoto({
      ...recipe,
      servings: servings ?? undefined,
      products: products
        .filter(
          (product) =>
            product.isActive &&
            productVegetableIds.includes(product.vegetableId),
        )
        .map((product) => ({
          id: product.id,
          vegetableId: product.vegetableId,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice,
          unit: product.unit,
          uglyReason: product.uglyReason,
          imageUrl: product.imageUrl,
        })),
      // 재료 채소는 판매 상품 유무와 독립적으로 유지한다.
      vegetables: recipe.vegetables.map((vegetable) => ({
        ...vegetable,
        imageUrl: vegetables.find((item) => item.id === vegetable.id)?.imageUrl,
      })),
    }),
  );
}
