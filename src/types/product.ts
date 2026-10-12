// 가격이 붙은 "판매 상품" 정보 (예: 해남 김씨농장의 못난이 당근 1kg)
// DB 테이블: products (ERD 2-2)
// DB 칸 이름은 snake_case(ugly_reason), 화면 코드는 camelCase(uglyReason)로 써요.

import type { VegetableCategory } from "./vegetable";

// 못난이가 된 이유: 이 4개 값만 쓸 수 있어요. (필터에 사용)
export type UglyReason =
  | "small" // 크기가 작아요
  | "bent" // 휘었어요
  | "scratched" // 흠집이 있어요
  | "irregular"; // 모양이 제각각이에요

// 화면에 보여줄 한글 문구 (카드의 작은 꼬리표)
export const UGLY_REASON_LABELS: Record<UglyReason, string> = {
  small: "크기가 작아요",
  bent: "휘어졌어요",
  scratched: "흠집 있어요",
  irregular: "모양이 제각각",
};

// 상품 이름표 양식
export interface Product {
  id: string; // 번호표. 예: "carrot-bent-1kg" (겹치면 안 돼요)
  vegetableId: string; // 어떤 채소의 상품인지. vegetables의 id를 가리켜요. 예: "carrot"
  name: string; // 상품 이름. 예: "못난이 당근 1kg"
  price: number; // 판매 가격(원). 0보다 커야 해요
  originalPrice: number; // 원래 가격(원). 판매 가격보다 같거나 커야 해요
  unit: string; // 판매 단위. 예: "1kg", "4입"
  uglyReason: UglyReason; // 못난이 이유
  conditionNote?: string; // 손님에게 보여줄 상태 설명 (없어도 됨)
  farmName: string; // 농가 이름
  farmRegion?: string; // 농가 지역 (없어도 됨)
  farmStory?: string; // 농가 이야기 (없어도 됨)
  imageUrl: string; // 사진 주소
  description: string; // 상품 설명
  isSeasonal: boolean; // 제철 상품인가요?
  isFeatured: boolean; // 메인 "추천 상품"에 보여줄까요?
  isActive: boolean; // 지금 판매 중인가요?
  tagline?: string; // 카드 위 홍보 문구 (없어도 됨)
  rating?: number; // 시연용 가상 평균 별점 0~5 (없어도 됨)
  reviewCount: number; // 시연용 가상 리뷰 수
}

// 상품 목록 화면에서 쓰는 모양: 상품 + 채소 분류(필터용)
export interface ProductListItem extends Product {
  category: VegetableCategory; // 채소 분류는 vegetables 표에서 가져와요
}

// 상품 목록을 고를 때 쓰는 조건 (필터·정렬)
export type ProductSort = "recommended" | "seasonal" | "reviews" | "newest" | "price_asc" | "price_desc" | "discount_desc";

export interface ProductFilters {
  category?: VegetableCategory; // 분류로 고르기
  uglyReason?: UglyReason; // 못난이 이유로 고르기
  minPrice?: number; // 최소 가격
  maxPrice?: number; // 최대 가격
  sort?: ProductSort; // 정렬 방법
}
