// 레시피 관련 Zod 검증 (A 담당)
// 외부에서 들어오는 값(URL 검색 조건, DB에서 읽은 JSON)만 검증해요.

import { z } from "zod";
import type { RecipeFilters } from "@/types/recipe";

// 레시피·채소 id: 영문 소문자·숫자·하이픈
export const recipeIdSchema = z.string().regex(/^[a-z0-9-]{1,80}$/);
const vegetableIdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);

const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

// /recipes?q=당근&vegetable=carrot&difficulty=easy 의 값을 안전하게 읽어요.
// 잘못된 값은 오류 화면 대신 "조건 없음"으로 취급해요.
export const recipeFiltersSchema = z.object({
  q: z
    .preprocess(
      (value) =>
        typeof firstValue(value) === "string"
          ? String(firstValue(value)).slice(0, 50)
          : undefined,
      z.string().trim().optional(),
    )
    .transform((value) => value || undefined),
  vegetable: z
    .preprocess(firstValue, vegetableIdSchema.optional())
    .catch(undefined),
  difficulty: z
    .preprocess(firstValue, z.enum(["easy", "normal", "hard"]).optional())
    .catch(undefined),
});

export function parseRecipeFilters(
  searchParams: Record<string, unknown>,
): RecipeFilters {
  const parsed = recipeFiltersSchema.safeParse(searchParams);
  return parsed.success ? parsed.data : {};
}

// ---- DB에서 읽은 행 검증 (Supabase 모드) ----

export const recipeIngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.string(),
});

const vegetableRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  image_path: z.string().nullable(),
});

const productRowSchema = z.object({
  id: z.string(),
  vegetable_id: z.string(),
  name: z.string(),
  price: z.number(),
  original_price: z.number(),
  unit: z.string(),
  ugly_reason: z.enum(["small", "bent", "scratched", "irregular"]),
  image_path: z.string().nullable(),
  vegetables: vegetableRowSchema.nullable(),
});

export const recipeRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  cook_time_min: z.number().positive().nullable(),
  difficulty: z.enum(["easy", "normal", "hard"]).nullable(),
  source_url: z.string().url().nullable(),
  source_name: z.string().nullable(),
  vegetables: z.array(
    z.object({ id: vegetableIdSchema, name: z.string().min(1) }),
  ),
  servings: z.number().nullable(),
  ingredients: z.array(recipeIngredientSchema),
  steps: z.array(z.string()),
  image_path: z.string().nullable(),
  // RLS 때문에 판매 종료 상품은 null 로 돌아와요.
  recipe_products: z.array(z.object({ products: productRowSchema.nullable() })),
});

export type RecipeRow = z.infer<typeof recipeRowSchema>;
