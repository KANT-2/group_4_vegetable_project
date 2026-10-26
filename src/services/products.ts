import "server-only";
import { products as mockProducts } from "@/data/mock/products";
import { rankProducts } from "@/lib/product-ranking";
import { getProductImages } from "@/lib/product-gallery";
import type { CatalogFilters } from "@/schemas/product";
import type { Product, ProductListItem, UglyReason } from "@/types/product";
import { getVegetables } from "./vegetables";
import { managedProducts } from "./managed-content";
import { isFastApiCatalog } from "@/lib/catalog-mode";
import { catalogProduct, type CatalogPage } from "@/lib/catalog-api";
import { fastApi, FastApiError } from "@/lib/fastapi";

export async function getCatalogPage(
  filters: CatalogFilters,
  page = 1,
  size = 20,
) {
  if (!isFastApiCatalog()) {
    const all = await getProductList(filters);
    const counts = countByReason(
      await getProductList({ ...filters, reason: undefined }),
    );
    return {
      items: all.slice((page - 1) * size, page * size),
      total: all.length,
      page,
      size,
      reasonCounts: counts,
    };
  }
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  for (const [key, value] of Object.entries(filters))
    if (value) query.set(key, String(value));
  const result = await fastApi<CatalogPage>(
    `/api/v1/catalog/products?${query}`,
  );
  return {
    items: result.items.map(catalogProduct),
    total: result.total,
    page,
    size,
    reasonCounts: result.reason_counts,
  };
}

async function getActiveProducts(): Promise<Product[]> {
  if (!isFastApiCatalog())
    return managedProducts(
      mockProducts
        .filter((p) => p.isActive)
        .map((p) => ({ ...p, imageUrl: getProductImages(p)[0] ?? p.imageUrl })),
    );
  const result: Product[] = [];
  let page = 1;
  while (true) {
    const batch = await getCatalogPage({ sort: "recommended" }, page, 100);
    result.push(...batch.items);
    if (!batch.items.length || page * batch.size >= batch.total) return result;
    page++;
  }
}

export async function getProductList(
  filters: CatalogFilters,
): Promise<ProductListItem[]> {
  if (isFastApiCatalog()) {
    const result: ProductListItem[] = [];
    let page = 1;
    while (true) {
      const batch = await getCatalogPage(filters, page, 100);
      result.push(...batch.items);
      if (!batch.items.length || page * batch.size >= batch.total)
        return result;
      page++;
    }
  }
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

  let list = products
    .map((p) => ({
      ...p,
      category:
        (p as ProductListItem).category ??
        categoryOf.get(p.vegetableId) ??
        "root",
    }))
    .filter(
      (p) =>
        (!filters.category || p.category === filters.category) &&
        (!filters.reason || p.uglyReason === filters.reason) &&
        (!keyword || matchesKeyword(p)),
    );

  if (filters.collection) {
    const { COLLECTIONS } = await import("@/lib/catalog");
    list = list.filter(COLLECTIONS[filters.collection].match);
  }
  return filters.sort === "newest" ? list : rankProducts(list, filters.sort);
}

// 못난이 이유별 상품 개수 (필터 버튼에 보여 줘요)
export function countByReason(list: Product[]): Record<UglyReason, number> {
  const counts = { small: 0, bent: 0, scratched: 0, irregular: 0 };
  for (const p of list) counts[p.uglyReason] += 1;
  return counts;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isFastApiCatalog())
    return (
      (await getActiveProducts()).find((product) => product.id === id) ?? null
    );
  try {
    const row = await fastApi<import("@/lib/catalog-api").CatalogProduct>(
      `/api/v1/catalog/products/${encodeURIComponent(id)}`,
    );
    return catalogProduct(row);
  } catch (error) {
    if (error instanceof FastApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getProductsByVegetable(
  vegetableId: string,
): Promise<Product[]> {
  const products = await getActiveProducts();
  return products.filter((p) => p.vegetableId === vegetableId);
}

// 레시피 빌드와 공개 조회에는 사용자 쿠키를 읽지 않는 연결을 사용해요.
export async function getPublicProducts(): Promise<Product[]> {
  return getActiveProducts();
}
