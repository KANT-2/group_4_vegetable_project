// 메인·농가 이야기 화면이 쓰는 상품·농가 조회 (A 담당) — 서버에서만 실행돼요.
// 상품·채소의 원래 담당은 B예요. B의 조회 함수가 main에 합쳐지면 이 파일의 내용을 그 함수로 바꿔요.
// Mock / Supabase 선택 규칙은 services/recipes.ts 와 같아요.

import "server-only";
import { products as mockProducts } from "@/data/mock/products";
import { vegetables as mockVegetables } from "@/data/mock/vegetables";
import {
  showcaseProductRowSchema,
  type ShowcaseProductRow,
} from "@/schemas/showcase";
import { getDataSource } from "@/lib/data-source";
import { getImageUrl } from "@/lib/storage";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { FarmStory, FeaturedProduct } from "@/types/showcase";

const FEATURED_COUNT = 4; // README: 메인 추천 상품은 4개

const PRODUCT_SELECT = `
  id, vegetable_id, name, price, original_price, unit, ugly_reason, image_path,
  farm_name, farm_region, farm_story,
  vegetables ( name )
`;

async function fetchSupabaseProductRows(
  onlyFeatured: boolean,
): Promise<ShowcaseProductRow[]> {
  const supabase = createPublicSupabaseClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true);
  if (onlyFeatured) query = query.eq("is_featured", true).limit(FEATURED_COUNT);
  const { data, error } = await query
    .order("created_at", { ascending: true })
    .order("id");

  if (error) {
    console.error("[showcase] Supabase 조회 실패:", error);
    throw new Error("상품을 불러오지 못했어요.");
  }
  return showcaseProductRowSchema.array().parse(data);
}

// 메인 "추천 농산물" (is_featured 인 판매 중 상품 4개)
export async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  if (getDataSource() === "mock") {
    return mockProducts
      .filter((product) => product.isFeatured && product.isActive)
      .slice(0, FEATURED_COUNT)
      .map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        unit: product.unit,
        uglyReason: product.uglyReason,
        imageUrl: product.imageUrl,
        farmName: product.farmName,
        farmRegion: product.farmRegion,
      }));
  }

  const rows = await fetchSupabaseProductRows(true);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    originalPrice: row.original_price,
    unit: row.unit,
    uglyReason: row.ugly_reason,
    imageUrl: getImageUrl(row.image_path) ?? "",
    farmName: row.farm_name,
    farmRegion: row.farm_region ?? undefined,
  }));
}

// 농가 이야기 화면: 농가별로 상품을 묶어서 돌려줘요.
export async function getFarmStories(): Promise<FarmStory[]> {
  type Item = {
    farmName: string;
    farmRegion?: string;
    story?: string;
    product: FarmStory["products"][number];
  };

  let items: Item[];
  if (getDataSource() === "mock") {
    const vegetableName = new Map(
      mockVegetables.map((vegetable) => [vegetable.id, vegetable.name]),
    );
    items = mockProducts
      .filter((product) => product.isActive)
      .map((product) => ({
        farmName: product.farmName,
        farmRegion: product.farmRegion,
        story: product.farmStory,
        product: {
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          vegetableId: product.vegetableId,
          vegetableName: vegetableName.get(product.vegetableId) ?? product.name,
        },
      }));
  } else {
    const rows = await fetchSupabaseProductRows(false);
    items = rows.map((row) => ({
      farmName: row.farm_name,
      farmRegion: row.farm_region ?? undefined,
      story: row.farm_story ?? undefined,
      product: {
        id: row.id,
        name: row.name,
        imageUrl: getImageUrl(row.image_path) ?? "",
        vegetableId: row.vegetable_id,
        vegetableName: row.vegetables?.name ?? row.name,
      },
    }));
  }

  const farms = new Map<string, FarmStory>();
  for (const { farmName, farmRegion, story, product } of items) {
    const farm = farms.get(farmName);
    if (farm) {
      farm.products.push(product);
    } else {
      farms.set(farmName, { farmName, farmRegion, story, products: [product] });
    }
  }
  return [...farms.values()];
}
