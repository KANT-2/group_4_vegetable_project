import "server-only";
import catalogRows from "../../data/food-catalog/nutrition.json";
import extraRows from "../../data/nutrition/fct-2006-b.json";

// 식품성분표 제7개정판(2006) 기준 생것 가식부 100g 영양 성분
// - data/food-catalog/nutrition.json: A(영우 님) 카탈로그 6종
// - data/nutrition/fct-2006-b.json: B가 같은 PDF에서 옮긴 나머지 15종
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
  vitaminCIsTrace: boolean;
};

type NutritionRow = {
  id: string;
  vegetable_id: string;
  variety: string;
  fat_value_status: string;
  vitamin_c_value_status?: string;
  energy_kcal: number | null;
  carbohydrate_g: number | null;
  protein_g: number | null;
  fat_g: number | null;
  potassium_mg: number | null;
  vitamin_c_mg: number | null;
};

// 카탈로그 채소 ID와 우리 DB 채소 ID가 다른 경우
const VEGETABLE_ID_ALIASES: Record<string, string> = {
  paprika: "bell-pepper",
};

const rows: NutritionRow[] = [
  ...(catalogRows as NutritionRow[]),
  ...(extraRows as NutritionRow[]),
];

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
    vitaminCIsTrace: row.vitamin_c_value_status === "trace",
  };
}

export function getNutritionByVegetable(
  vegetableId: string,
): NutritionProfile[] {
  const catalogId = VEGETABLE_ID_ALIASES[vegetableId] ?? vegetableId;
  return rows.filter((row) => row.vegetable_id === catalogId).map(toProfile);
}
