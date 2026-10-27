import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { fastApi } from "@/lib/fastapi";
import type { ProductListItem } from "@/types/product";
import type { Database } from "@/types/database";
import { toImageSrc } from "@/services/catalog-source";
import { getProductImages } from "@/lib/product-gallery";

export type CatalogProduct = Database["public"]["Tables"]["products"]["Row"] & {
  category: ProductListItem["category"];
};
export type CatalogPage = {
  items: CatalogProduct[];
  total: number;
  page: number;
  size: number;
  reason_counts: Record<ProductListItem["uglyReason"], number>;
};
export type WishPage = {
  items: { product_id: string; created_at: string; product: CatalogProduct }[];
  total: number;
  page: number;
  size: number;
};
export async function catalogToken() {
  return (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
}
export function catalogProduct(row: CatalogProduct): ProductListItem {
  return {
    id: row.id,
    vegetableId: row.vegetable_id,
    category: row.category,
    name: row.name,
    price: row.price,
    originalPrice: row.original_price,
    unit: row.unit,
    uglyReason: row.ugly_reason as ProductListItem["uglyReason"],
    conditionNote: row.condition_note ?? undefined,
    farmName: row.farm_name,
    farmRegion: row.farm_region ?? undefined,
    farmStory: row.farm_story ?? undefined,
    imageUrl:
      getProductImages({
        id: row.id,
        vegetableId: row.vegetable_id,
        imageUrl: toImageSrc(row.image_path),
      })[0] ?? "",
    description: row.description,
    isSeasonal: row.is_seasonal,
    isFeatured: row.is_featured,
    isActive: row.is_active,
    tagline: row.tagline ?? undefined,
    rating: row.rating ?? undefined,
    reviewCount: row.review_count,
    stock: row.stock,
  };
}
export async function wishlistIds(token: string) {
  return fastApi<string[]>("/api/v1/catalog/wishlist/ids", {}, token);
}
export async function wishlistPages(token: string) {
  const items: WishPage["items"] = [];
  let page = 1;
  while (true) {
    const result = await fastApi<WishPage>(
      `/api/v1/catalog/wishlist?page=${page}&size=100`,
      {},
      token,
    );
    items.push(...result.items);
    if (!result.items.length || page * result.size >= result.total)
      return items;
    page++;
  }
}
