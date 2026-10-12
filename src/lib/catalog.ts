import { getDiscountRate } from "@/lib/format";
import type { CatalogFilters } from "@/schemas/product";
import type { Product, ProductSort } from "@/types/product";

// 정렬 버튼에 보여 줄 이름
export const SORT_LABELS: Record<ProductSort, string> = {
  newest: "기본순",
  price_asc: "낮은 가격순",
  price_desc: "높은 가격순",
  discount_desc: "할인율순",
};

// 필터 버튼을 눌렀을 때 갈 주소: 지금 조건에서 하나만 바꿔요.
export function catalogHref(
  current: CatalogFilters,
  change: Partial<CatalogFilters>,
) {
  const next = { ...current, ...change };
  const query = new URLSearchParams();
  if (next.category) query.set("category", next.category);
  if (next.reason) query.set("reason", next.reason);
  if (next.sort && next.sort !== "newest") query.set("sort", next.sort);
  if (next.collection) query.set("collection", next.collection);
  const text = query.toString();
  return text ? `/products?${text}` : "/products";
}

// 판매 단위에서 무게(kg) 읽기: "3kg" → 3, "1통 (약 2kg)" → 2, "500g" → 0.5
function weightKg(unit: string): number {
  const kg = unit.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kg) return Number(kg[1]);
  const g = unit.match(/(\d+)\s*g/);
  return g ? Number(g[1]) / 1000 : 0;
}

export type CollectionKey = NonNullable<CatalogFilters["collection"]>;

// 상품 코너: 이미 있는 DB 칸(제철·가격·단위·못난이 이유)으로 골라요.
export const COLLECTIONS: Record<
  CollectionKey,
  {
    emoji: string;
    title: string;
    description: string;
    match: (p: Product) => boolean;
  }
> = {
  seasonal: {
    emoji: "🍂",
    title: "지금이 제철이에요",
    description: "가장 맛있을 때 밭에서 바로 왔어요.",
    match: (p) => p.isSeasonal,
  },
  bigsale: {
    emoji: "💸",
    title: "40% 넘게 아껴요",
    description: "모양만 다르고 맛은 같은데, 가격은 훨씬 가벼워요.",
    match: (p) => getDiscountRate(p.price, p.originalPrice) >= 40,
  },
  bulk: {
    emoji: "🧺",
    title: "넉넉하게 담았어요",
    description: "자주 요리하는 집을 위한 3kg 이상 실속 상품이에요.",
    match: (p) => weightKg(p.unit) >= 3,
  },
  single: {
    emoji: "🙋",
    title: "혼자 먹기 딱 좋아요",
    description: "작아서 한 번에 다 쓰기 좋은 1인 가구용이에요.",
    match: (p) => p.uglyReason === "small" && weightKg(p.unit) < 3,
  },
};
