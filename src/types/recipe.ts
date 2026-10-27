// 레시피 정보 (A 담당)
// DB 테이블: recipes, recipe_products (ERD 2-3, 2-4)
// DB 칸 이름은 snake_case(cook_time_min), 화면 코드는 camelCase(cookTimeMin)로 써요.

import type { Product } from "./product";

// 난이도: 이 3개 값만 쓸 수 있어요.
export type RecipeDifficulty = "easy" | "normal" | "hard";

export const RECIPE_DIFFICULTY_LABELS: Record<RecipeDifficulty, string> = {
  easy: "쉬움",
  normal: "보통",
  hard: "어려움",
};

// 재료 한 줄. 판매하지 않는 재료(올리브유 등)도 여기에만 적어요.
export interface RecipeIngredient {
  name: string; // 예: "당근"
  amount: string; // 예: "2개"
}

// 레시피에 쓰이는 채소 (recipe_products → products → vegetables 로 이어져요)
export interface RecipeVegetable {
  id: string; // 예: "carrot"
  name: string; // 예: "당근"
  imageUrl?: string; // 채소 사진 (요리 사진이 없을 때 임시로 보여줘요)
}

// 이 요리에 쓸 수 있는 판매 상품. B의 Product에서 필요한 칸만 가져와요.
export type RecipeProduct = Pick<
  Product,
  | "id"
  | "vegetableId"
  | "name"
  | "price"
  | "originalPrice"
  | "unit"
  | "uglyReason"
  | "imageUrl"
  | "stock"
>;

export interface Recipe {
  replacesRecipeId?: string; // 편집 레시피가 대체하여 화면에서 제외할 기존 레시피
  photoReference?: {
    generated?: boolean;
    source: string;
    author: string;
    license: string;
    licenseUrl: string;
    title: string;
    imageUrl: string;
  };
  primaryVegetableId?: string; // 직접 작성한 집밥 레시피의 주재료
  id: string; // 예: "carrot-rapee"
  name: string; // 요리 이름
  description: string; // 한 줄 소개
  cookTimeMin: number | null; // 원문 미기재는 null
  difficulty: RecipeDifficulty | null;
  sourceUrl?: string;
  sourceName?: string;
  servings?: number; // 기준 인분
  ingredients: RecipeIngredient[];
  steps: string[]; // 조리 순서 (배열 순서가 곧 단계 순서)
  imageAlt?: string;
  imageUrl?: string; // 요리 사진 (없어도 됨)
  additionalImageUrls?: string[]; // 대표 사진 다음에 순환할 추가 요리 사진
  products: RecipeProduct[]; // 연결된 판매 상품
  vegetables: RecipeVegetable[]; // 연결된 상품의 채소 (중복 없음)
}

// 상세 화면에서만 필요한 값
export interface RecipeDetail extends Recipe {
  relatedRecipes: Recipe[]; // 같은 채소를 쓰는 다른 레시피
}

// 목록 검색·필터 조건 (URL의 ?q=…&vegetable=… 와 같아요)
export interface RecipeFilters {
  q?: string; // 이름·소개·재료·채소 이름에서 검색
  vegetable?: string; // 채소 id
  difficulty?: RecipeDifficulty; // 조리 난이도
}

// 필터 칩에 보여줄 채소와 그 채소를 쓰는 레시피 수
export interface RecipeVegetableOption extends RecipeVegetable {
  recipeCount: number;
}
