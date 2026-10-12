import assets from "../data/recipe-photo-assets.json" with { type: "json" };
import type { Recipe } from "../types/recipe.ts";

const PHOTO_BY_RECIPE: Record<string, keyof typeof assets> = {
  "official-98711": "soup",
  "official-208530": "pancake",
  "official-206629": "salad",
  "official-98889": "japchae",
  "official-200113": "dumplings",
  "official-98885": "salad",
  "official-sprout207811": "salad",
  "official-mfds253": "tomato-duck",
  "official-mfds454": "pasta",
  "official-208146": "gratin",
  "official-201257": "water-kimchi",
  "official-208263": "chicken-vegetables",
  "official-mfds3287": "tacos",
  "official-213103": "salad",
  "official-200809": "chicken-vegetables",
  "official-211734": "gratin",
};
export function withRecipePhoto<T extends Recipe>(recipe: T): T {
  const key = PHOTO_BY_RECIPE[recipe.id];
  if (!key || recipe.imageUrl) return recipe;
  const photo = assets[key];
  return { ...recipe, imageUrl: photo.imageUrl, photoReference: photo };
}
