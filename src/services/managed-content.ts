import "server-only";
import { readContent, hiddenContent } from "@/lib/managed-content";
import { products as seeds } from "@/data/mock/products";
import type { Product } from "@/types/product";
import type { Recipe } from "@/types/recipe";
import type { FarmStory } from "@/types/showcase";
import type { AdminFarm } from "@/lib/admin-store";
import { managedPromotions } from "@/lib/admin-promotions";

export function managedProducts(base: Product[]) {
  const { state } = readContent();
  const seedById = new Map(seeds.map((product) => [product.id, product]));
  const changes = state.products.filter(
    (product) =>
      JSON.stringify(product) !== JSON.stringify(seedById.get(product.id)),
  );
  const byId = new Map(base.map((product) => [product.id, product]));
  const currentIds = new Set(state.products.map((product) => product.id));
  for (const id of seedById.keys()) if (!currentIds.has(id)) byId.delete(id);
  for (const product of changes)
    byId.set(product.id, { ...byId.get(product.id), ...product });
  return [...byId.values()].filter(
    (product) =>
      product.isActive && !hiddenContent(state, "product", product.id),
  );
}
export function managedRecipes(base: Recipe[], catalog: Product[] = seeds) {
  const { state } = readContent();
  const byId = new Map(base.map((recipe) => [recipe.id, recipe]));
  for (const recipe of Object.values(state.recipeChanges))
    byId.set(recipe.id, recipe);
  const products = new Map(
    managedProducts(catalog).map((product) => [product.id, product]),
  );
  return [...byId.values()]
    .filter((recipe) => !hiddenContent(state, "recipe", recipe.id))
    .map((recipe) => ({
      ...recipe,
      products: recipe.products.flatMap((product) =>
        products.has(product.id)
          ? [{ ...product, ...products.get(product.id)! }]
          : [],
      ),
    }));
}
export function publicPromotions() {
  return managedPromotions(readContent().state).filter(
    (promotion) => promotion.published,
  );
}
export function managedFarms(base: FarmStory[]): FarmStory[] {
  const { state } = readContent();
  const byId = new Map(base.map((farm) => [farm.farmName, farm]));
  for (const [key, value] of Object.entries(state.otherChanges ?? {})) {
    if (key.startsWith("farm:")) byId.set(value.id, value as AdminFarm);
  }
  return [...byId.entries()]
    .filter(([id]) => !hiddenContent(state, "farm", id))
    .map(([id, farm]) => ({ ...farm, id }));
}
