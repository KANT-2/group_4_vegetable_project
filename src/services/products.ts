import "server-only";
import { createClient } from "@/lib/supabase/server";
import { products as mockProducts } from "@/data/mock/products";
import { rankProducts } from "@/lib/product-ranking";
import { uglyReasonSchema, type CatalogFilters } from "@/schemas/product";
import type { Database } from "@/types/database";
import type { Product, ProductListItem, UglyReason } from "@/types/product";
import { isMockCatalog, toImageSrc } from "./catalog-source";
import { getVegetables } from "./vegetables";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

// DB 한 줄(snake_case) → 화면용 이름표(camelCase)
function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    vegetableId: row.vegetable_id,
    name: row.name,
    price: row.price,
    originalPrice: row.original_price,
    unit: row.unit,
    uglyReason: uglyReasonSchema.parse(row.ugly_reason),
    conditionNote: row.condition_note ?? undefined,
    farmName: row.farm_name,
    farmRegion: row.farm_region ?? undefined,
    farmStory: row.farm_story ?? undefined,
    imageUrl: toImageSrc(row.image_path) ?? "",
    description: row.description,
    isSeasonal: row.is_seasonal,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    tagline: row.tagline ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count,
  };
}

// 판매 중인 상품 전체 (RLS가 is_active = true인 상품만 돌려줘요)
async function getActiveProducts(): Promise<Product[]> {
  if (isMockCatalog()) return mockProducts.filter((p) => p.isActive);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at");
  if (error) throw new Error("상품을 불러오지 못했어요.");
  return data.map(toProduct);
}

// 상품 목록: 채소 분류를 붙이고 조건대로 거르고 정렬해요.
// 상품이 16개뿐이라 한 번에 받아서 서버에서 걸러요.
export async function getProductList(
  filters: CatalogFilters,
): Promise<ProductListItem[]> {
  const [products, vegetables] = await Promise.all([
    getActiveProducts(),
    getVegetables(),
  ]);
  const categoryOf = new Map(vegetables.map((v) => [v.id, v.category]));
  const vegetableName = new Map(vegetables.map((v) => [v.id, v.name]));
  // 검색은 띄어쓰기·대소문자 무시: "꿀 고구마" = "꿀고구마"
  const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();
  const keyword = filters.q ? normalize(filters.q) : "";
  const matchesKeyword = (p: Product) =>
    normalize(
      [p.name, p.farmName, p.tagline, vegetableName.get(p.vegetableId)].join(
        " ",
      ),
    ).includes(keyword);

  const list = products
    .map((p) => ({ ...p, category: categoryOf.get(p.vegetableId) ?? "root" }))
    .filter(
      (p) =>
        (!filters.category || p.category === filters.category) &&
        (!filters.reason || p.uglyReason === filters.reason) &&
        (!keyword || matchesKeyword(p)),
    );

  return filters.sort === "newest" ? list : rankProducts(list, filters.sort);
}

// 못난이 이유별 상품 개수 (필터 버튼에 보여 줘요)
export function countByReason(list: Product[]): Record<UglyReason, number> {
  const counts = { small: 0, bent: 0, scratched: 0, irregular: 0 };
  for (const p of list) counts[p.uglyReason] += 1;
  return counts;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (isMockCatalog())
    return mockProducts.find((p) => p.id === id && p.isActive) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new Error("상품을 불러오지 못했어요.");
  return data ? toProduct(data) : null;
}

export async function getProductsByVegetable(
  vegetableId: string,
): Promise<Product[]> {
  const products = await getActiveProducts();
  return products.filter((p) => p.vegetableId === vegetableId);
}
