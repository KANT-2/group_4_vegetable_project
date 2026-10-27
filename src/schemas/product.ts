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
  "recommended",
  "seasonal",
  "reviews",
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

// 주소의 ?category=&reason=&sort=&collection=&q= 검사
// 허용되지 않은 값(예: ?sort=hack)은 오류 대신 기본값으로 바꿔요.
const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

export const catalogFiltersSchema = z.object({
  category: z.preprocess(
    firstValue,
    vegetableCategorySchema.optional().catch(undefined),
  ),
  // 채소 종류 하나로 거르기 (제철 채소 달력에서 눌렀을 때). 예: ?vegetable=carrot
  vegetable: z.preprocess(
    firstValue,
    z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .max(100)
      .optional()
      .catch(undefined),
  ),
  reason: z.preprocess(
    firstValue,
    uglyReasonSchema.optional().catch(undefined),
  ),
  sort: z.preprocess(firstValue, productSortSchema.catch("recommended")),
  // 구매 옵션은 여러 개 고를 수 있어요: ?collection=seasonal&collection=bulk
  // 허용되지 않은 값은 빼고, 같은 값은 한 번만, 순서는 고정해요.
  collection: z.preprocess(
    (value) =>
      [
        ...new Set(
          (Array.isArray(value) ? value : value === undefined ? [] : [value])
            .map((item) => collectionSchema.safeParse(item))
            .filter((result) => result.success)
            .map((result) => result.data),
        ),
      ].sort(),
    z.array(collectionSchema).catch([]),
  ),
  // 검색어: 앞뒤 공백 제거, 빈 값은 없음으로, 너무 길면 30자까지만
  q: z.preprocess(
    firstValue,
    z
      .string()
      .trim()
      .transform((v) => v.slice(0, 30) || undefined)
      .optional()
      .catch(undefined),
  ),
});

// 주소에서 읽으면 collection 은 항상 배열이지만, 코드에서 부를 때는 생략할 수 있어요.
export type CatalogFilters = Omit<
  z.infer<typeof catalogFiltersSchema>,
  "collection"
> & { collection?: z.infer<typeof collectionSchema>[] };
