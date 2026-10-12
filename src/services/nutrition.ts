import "server-only";
import nutritionRows from "../../data/food-catalog/nutrition.json";

// 영우 님 카탈로그(식품성분표 제7개정판, 2006) 기준 생것 가식부 100g 영양 성분
export type NutritionProfile = {
  id: string;
  variety: string;
  energyKcal: number | null;
  carbohydrateG: number | null;
  proteinG: number | null;
  fatG: number | null;
  fatIsTrace: boolean;
  potassiumMg: number | null;
  vitaminCMg: number | null;
};

type NutritionRow = (typeof nutritionRows)[number];

// 카탈로그 채소 ID와 우리 DB 채소 ID가 다른 경우
const VEGETABLE_ID_ALIASES: Record<string, string> = {
  paprika: "bell-pepper",
};

export const NUTRITION_SOURCE =
  "농촌진흥청 식품성분표 제7개정판(2006), 생것 가식부 100g 기준";

function toProfile(row: NutritionRow): NutritionProfile {
  return {
    id: row.id,
    variety: row.variety,
    energyKcal: row.energy_kcal,
    carbohydrateG: row.carbohydrate_g,
    proteinG: row.protein_g,
    fatG: row.fat_g,
    fatIsTrace: row.fat_value_status === "trace",
    potassiumMg: row.potassium_mg,
    vitaminCMg: row.vitamin_c_mg,
  };
}

export function getNutritionByVegetable(
  vegetableId: string,
): NutritionProfile[] {
  const catalogId = VEGETABLE_ID_ALIASES[vegetableId] ?? vegetableId;
  return (nutritionRows as NutritionRow[])
    .filter((row) => row.vegetable_id === catalogId)
    .map(toProfile);
}
