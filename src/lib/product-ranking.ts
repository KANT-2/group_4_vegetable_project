import type { Product } from "../types/product.ts";

type Ranked = Pick<
  Product,
  | "id"
  | "price"
  | "originalPrice"
  | "isFeatured"
  | "isSeasonal"
  | "reviewCount"
  | "isActive"
>;
export function discountScore(product: Ranked) {
  return product.originalPrice > 0
    ? (product.originalPrice - product.price) / product.originalPrice
    : 0;
}
export function rankProducts<T extends Ranked>(
  products: T[],
  sort: string = "recommended",
): T[] {
  return [...products].sort((a, b) => {
    let score = 0;
    if (sort === "recommended")
      score =
        Number(b.isFeatured) - Number(a.isFeatured) ||
        Number(b.isSeasonal) - Number(a.isSeasonal) ||
        discountScore(b) - discountScore(a) ||
        a.price - b.price;
    if (sort === "seasonal")
      score =
        Number(b.isSeasonal) - Number(a.isSeasonal) ||
        discountScore(b) - discountScore(a);
    if (sort === "reviews") score = b.reviewCount - a.reviewCount;
    if (sort === "price_asc") score = a.price - b.price;
    if (sort === "price_desc") score = b.price - a.price;
    if (sort === "discount_desc") score = discountScore(b) - discountScore(a);
    return score || a.id.localeCompare(b.id, "en");
  });
}
export function pickRecommended<T extends Ranked & { vegetableId: string }>(
  products: T[],
  limit = 6,
): T[] {
  const ranked = rankProducts(products.filter((p) => p.isActive));
  const seen = new Set<string>();
  const diverse = ranked.filter((p) =>
    seen.has(p.vegetableId) ? false : (seen.add(p.vegetableId), true),
  );
  return [...diverse, ...ranked.filter((p) => !diverse.includes(p))].slice(
    0,
    limit,
  );
}
export const RECOMMENDATION_RULE =
  "운영 추천 → 제철 → 할인율 → 낮은 가격순으로 골라요.";

export function selectSeasonalFruit<T extends Ranked & { category: string }>(
  products: T[],
  limit = 6,
): T[] {
  return rankProducts(
    products.filter(
      (p) => p.isActive && p.isSeasonal && p.category === "fruit",
    ),
    "seasonal",
  ).slice(0, limit);
}
