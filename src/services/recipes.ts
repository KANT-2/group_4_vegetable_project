// 레시피 조회 (A 담당) — 서버에서만 실행돼요.
// 화면(페이지)은 이 파일의 함수만 부르고, Mock / Supabase 중 어디서 오는지는 몰라도 돼요.
//  - Mock 모드: src/data/mock 의 개발용 데이터 (src/lib/data-source.ts 참고)
//  - Supabase 모드: recipes ← recipe_products → products → vegetables (공개 읽기, RLS 적용)
// DB 요청이 실패하면 Mock으로 바꾸지 않고 오류를 그대로 던져요. (error.tsx 가 안내해요)
//
// 레시피는 수십 개 규모를 가정해 한 번에 모두 읽은 뒤 서버에서 검색·필터해요.
// 수백 개 이상으로 늘어나면 loadAllRecipes 대신 DB 쿼리 조건으로 바꾸세요.

import "server-only";
import { cache } from "react";
import easyRecipes from "@/data/easy-recipes.json";
import { getPublicProducts } from "./products";
import { managedRecipes } from "./managed-content";
import { getPublicVegetables } from "./vegetables";
import {
  mergeRecipeCatalogs,
  recipeVegetableIds,
} from "@/lib/recipe-relevance";
import verifiedRecipes from "@/data/generated/verified-recipes.json";
import {
  connectCatalogRecipes,
  type CatalogRecipe,
} from "@/lib/recipe-catalog";
const easyCatalog = easyRecipes.map((recipe): CatalogRecipe => ({
  ...recipe,
  difficulty: recipe.difficulty as CatalogRecipe["difficulty"],
}));
import { withRecipePhoto } from "@/lib/recipe-photos";
import { products as mockProducts } from "@/data/mock/products";
import { vegetables as mockVegetables } from "@/data/mock/vegetables";
import { recipeRowSchema, type RecipeRow } from "@/schemas/recipe";
import { getDataSource } from "@/lib/data-source";
import { getImageUrl } from "@/lib/storage";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type {
  Recipe,
  RecipeDetail,
  RecipeFilters,
  RecipeProduct,
  RecipeVegetable,
  RecipeVegetableOption,
} from "@/types/recipe";

// ---------- Mock 모드 ----------

function loadMockRecipes(): Recipe[] {
  return mergeRecipeCatalogs(
    connectCatalogRecipes(easyCatalog, mockProducts, mockVegetables),
    connectCatalogRecipes(verifiedRecipes, mockProducts, mockVegetables),
  );
}

// ---------- Supabase 모드 ----------

const RECIPE_SELECT = `
  id, name, description, cook_time_min, difficulty, servings, ingredients, steps, image_path,
  source_url, source_name, vegetables,
  recipe_products (
    products (
      id, vegetable_id, name, price, original_price, unit, ugly_reason, image_path,
      vegetables ( id, name, image_path )
    )
  )
`;

async function fetchSupabaseRecipeRows(): Promise<RecipeRow[]> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    // 원인은 서버 로그에만 남기고, 화면·오류 메시지에는 DB 내부 정보를 싣지 않아요.
    console.error("[recipes] Supabase 조회 실패:", error);
    throw new Error("레시피를 불러오지 못했어요.");
  }
  // DB의 JSON 칸(ingredients, steps)이 약속한 모양인지 확인해요.
  return recipeRowSchema.array().parse(data);
}

function rowToRecipe(row: RecipeRow): Recipe {
  const products: RecipeProduct[] = [];
  const vegetables: RecipeVegetable[] = [];

  for (const link of row.recipe_products) {
    const product = link.products;
    if (!product) continue;
    products.push({
      id: product.id,
      vegetableId: product.vegetable_id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price,
      unit: product.unit,
      uglyReason: product.ugly_reason,
      imageUrl: getImageUrl(product.image_path) ?? "",
    });
    if (product.vegetables) {
      vegetables.push({
        id: product.vegetables.id,
        name: product.vegetables.name,
        imageUrl: getImageUrl(product.vegetables.image_path) ?? undefined,
      });
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    cookTimeMin: row.cook_time_min,
    difficulty: row.difficulty,
    servings: row.servings ?? undefined,
    ingredients: row.ingredients,
    steps: row.steps,
    imageUrl: getImageUrl(row.image_path) ?? undefined,
    products,
    vegetables: uniqueVegetables([...row.vegetables, ...vegetables]),
    sourceUrl: row.source_url ?? undefined,
    sourceName: row.source_name ?? undefined,
  };
}

// ---------- 공통 ----------

function uniqueVegetables(vegetables: RecipeVegetable[]): RecipeVegetable[] {
  const seen = new Set<string>();
  return vegetables.filter((vegetable) => {
    if (seen.has(vegetable.id)) return false;
    seen.add(vegetable.id);
    return true;
  });
}

// 한 요청 안에서 여러 번 불러도 한 번만 읽어요.
const loadAllRecipes = cache(async (): Promise<Recipe[]> => {
  if (getDataSource() === "mock")
    return managedRecipes(loadMockRecipes(), await getPublicProducts());
  // 편집 레시피는 배포에 포함되고 상품 연결은 실제 DB 상품으로 계산해요.
  // DB 오류는 그대로 전파하며, 공식 DB 데이터를 Mock으로 대체하지 않아요.
  const [rows, products, vegetables] = await Promise.all([
    fetchSupabaseRecipeRows(),
    getPublicProducts(),
    getPublicVegetables(),
  ]);
  return managedRecipes(
    mergeRecipeCatalogs(
      connectCatalogRecipes(easyCatalog, products, vegetables),
      rows.map((row) => withRecipePhoto(rowToRecipe(row))),
    ),
    products,
  );
});

function matchesFilters(
  recipe: Recipe,
  { q, vegetable }: RecipeFilters,
): boolean {
  if (vegetable && !recipeVegetableIds(recipe).includes(vegetable))
    return false;

  const terms = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = [
    recipe.name,
    recipe.description,
    ...recipe.ingredients.map((ingredient) => ingredient.name),
    ...recipe.vegetables.map((item) => item.name),
  ]
    .join(" ")
    .toLowerCase();
  // 검색어가 여러 개면 모두 들어 있는 레시피만 보여줘요.
  return terms.every((term) => haystack.includes(term));
}

// ---------- 화면에서 쓰는 함수 ----------

// 레시피 목록 (검색·채소 필터 적용)
export async function getRecipes(
  filters: RecipeFilters = {},
): Promise<Recipe[]> {
  const recipes = await loadAllRecipes();
  return recipes.filter((recipe) => matchesFilters(recipe, filters));
}

// 필터 칩에 보여줄 채소들 (레시피가 하나라도 있는 채소만)
export async function getRecipeVegetableOptions(): Promise<
  RecipeVegetableOption[]
> {
  const recipes = await loadAllRecipes();
  const options = new Map<string, RecipeVegetableOption>();
  for (const recipe of recipes) {
    for (const vegetable of recipe.vegetables.filter((item) =>
      recipeVegetableIds(recipe).includes(item.id),
    )) {
      const current = options.get(vegetable.id);
      options.set(vegetable.id, {
        ...vegetable,
        recipeCount: (current?.recipeCount ?? 0) + 1,
      });
    }
  }
  return [...options.values()];
}

// 레시피 한 개 + 관련 레시피. 없는 id 이면 null (페이지에서 404 처리)
export async function getRecipe(id: string): Promise<RecipeDetail | null> {
  const recipes = await loadAllRecipes();
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe) return null;

  const vegetableIds = new Set(recipeVegetableIds(recipe));
  const relatedRecipes = recipes.filter(
    (other) =>
      other.id !== recipe.id &&
      recipeVegetableIds(other).some((id) => vegetableIds.has(id)),
  );
  return { ...recipe, relatedRecipes };
}

// 상품 상세(B)에서 "관련 요리"를 보여줄 때 사용
export async function getRecipesByProduct(
  productId: string,
): Promise<Recipe[]> {
  const recipes = await loadAllRecipes();
  return recipes.filter((recipe) =>
    recipe.products.some((product) => product.id === productId),
  );
}

// 채소 정보(B)에서 "관련 요리"를 보여줄 때 사용. 같은 레시피는 한 번만 나와요.
export async function getRecipesByVegetable(
  vegetableId: string,
): Promise<Recipe[]> {
  return getRecipes({ vegetable: vegetableId });
}

// 상세 페이지를 미리 만들 레시피 id 목록
export async function getRecipeIds(): Promise<string[]> {
  const recipes = await loadAllRecipes();
  return recipes.map((recipe) => recipe.id);
}
