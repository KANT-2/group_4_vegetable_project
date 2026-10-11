import { z } from "zod";
import { vegetableCategorySchema } from "./vegetable";

// 못난이 이유: DB CHECK와 같은 4개 값
export const uglyReasonSchema = z.enum([
  "small",
  "bent",
  "scratched",
  "irregular",
]);

export const productSortSchema = z.enum([
  "newest",
  "price_asc",
  "price_desc",
  "discount_desc",
]);

// 상품 코너(추천 묶음): lib/catalog.ts의 COLLECTIONS와 같은 값
export const collectionSchema = z.enum([
  "seasonal",
  "bigsale",
  "bulk",
  "single",
]);

// 주소의 ?category=&reason=&sort=&collection= 검사
// 허용되지 않은 값(예: ?sort=hack)은 오류 대신 기본값으로 바꿔요.
const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const catalogFiltersSchema = z.object({
  category: z.preprocess(
    firstValue,
    vegetableCategorySchema.optional().catch(undefined),
  ),
  reason: z.preprocess(
    firstValue,
    uglyReasonSchema.optional().catch(undefined),
  ),
  sort: z.preprocess(firstValue, productSortSchema.catch("newest")),
  collection: z.preprocess(
    firstValue,
    collectionSchema.optional().catch(undefined),
  ),
});

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;
