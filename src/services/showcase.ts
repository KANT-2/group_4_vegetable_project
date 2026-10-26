// 메인·농가 이야기 화면이 쓰는 상품·농가 조회 (A 담당) — 서버에서만 실행돼요.
// 상품·채소의 원래 담당은 B예요. B의 조회 함수가 main에 합쳐지면 이 파일의 내용을 그 함수로 바꿔요.
// Mock / Supabase 선택 규칙은 services/recipes.ts 와 같아요.

import "server-only";
import type { FarmStory, FeaturedProduct } from "@/types/showcase";
import { managedFarms } from "./managed-content";
import { getPublicProducts } from "./products";
import { getPublicVegetables } from "./vegetables";

export async function getFeaturedProducts(): Promise<FeaturedProduct[]> {
  return (await getPublicProducts())
    .filter((p) => p.isActive && p.isFeatured)
    .slice(0, 4);
}

export async function getFarmStories(
  includeManaged = true,
): Promise<FarmStory[]> {
  const [products, vegetables] = await Promise.all([
    getPublicProducts(),
    getPublicVegetables(),
  ]);
  const vegetableName = new Map(vegetables.map((v) => [v.id, v.name]));
  const items = products
    .filter((p) => p.isActive)
    .map((p) => ({
      farmName: p.farmName,
      farmRegion: p.farmRegion,
      story: p.farmStory,
      product: {
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        vegetableId: p.vegetableId,
        vegetableName: vegetableName.get(p.vegetableId) ?? p.name,
      },
    }));

  const farms = new Map<string, FarmStory>();
  for (const { farmName, farmRegion, story, product } of items) {
    const farm = farms.get(farmName);
    if (farm) {
      farm.products.push(product);
    } else {
      farms.set(farmName, { farmName, farmRegion, story, products: [product] });
    }
  }
  return includeManaged
    ? managedFarms([...farms.values()])
    : [...farms.values()];
}
