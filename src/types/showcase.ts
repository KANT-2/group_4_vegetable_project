// 메인·농가 이야기 화면이 상품 쪽(B) 데이터를 가볍게 가져다 쓰는 모양 (A 담당)
// B의 상품 조회 함수(getProducts 등)가 생기면 services/showcase.ts 안에서 그 함수로 바꿔요.

import type { Product } from "./product";

// 메인 "추천 농산물" 카드에 필요한 값
export type FeaturedProduct = Pick<
  Product,
  | "id"
  | "name"
  | "price"
  | "originalPrice"
  | "unit"
  | "uglyReason"
  | "imageUrl"
  | "farmName"
> & { farmRegion?: string };

// 농가 이야기 화면의 농가 한 곳
export interface FarmStory {
  farmName: string;
  farmRegion?: string;
  story?: string; // products.farm_story
  products: {
    id: string;
    name: string;
    imageUrl: string;
    vegetableId: string;
    vegetableName: string;
  }[];
}
