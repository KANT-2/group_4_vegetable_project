// 농가 이야기 화면에서 쓰는 계산 (A 담당)
// 화면과 떨어뜨려 두어 node --test 로 바로 확인할 수 있어요.

import type { FarmStory } from "../types/showcase.ts";

// "9~12월", "3~5월, 9~11월", "11~2월"(해를 넘김), "사계절" → 해당하는 달 목록
export function seasonMonths(season: string | undefined): number[] {
  if (!season) return [];
  if (season.includes("사계절")) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const months = new Set<number>();
  for (const match of season.matchAll(/(\d{1,2})\s*~\s*(\d{1,2})\s*월/g)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    for (let month = start; ; month = (month % 12) + 1) {
      months.add(month);
      if (month === end || months.size >= 12) break;
    }
  }
  for (const match of season.matchAll(/(?:^|[^~\d])(\d{1,2})\s*월/g))
    months.add(Number(match[1]));
  return [...months]
    .filter((month) => month >= 1 && month <= 12)
    .sort((a, b) => a - b);
}

export function isInSeason(season: string | undefined, month: number) {
  return seasonMonths(season).includes(month);
}

// "전라남도 해남" → "전남". 이미 짧은 이름이면 그대로 써요.
const PROVINCE_SHORT: Record<string, string> = {
  강원도: "강원",
  강원특별자치도: "강원",
  경기도: "경기",
  경상남도: "경남",
  경상북도: "경북",
  전라남도: "전남",
  전라북도: "전북",
  전북특별자치도: "전북",
  충청남도: "충남",
  충청북도: "충북",
  제주특별자치도: "제주",
};

export function provinceOf(region: string | undefined): string | null {
  const first = region?.trim().split(/\s+/)[0];
  if (!first) return null;
  return PROVINCE_SHORT[first] ?? first;
}

export interface ProvinceGroup {
  province: string;
  farms: FarmStory[];
}

// 시·도별로 농가를 묶어요. 농가가 많은 지역부터 보여 줘요.
export function groupFarmsByProvince(farms: FarmStory[]): ProvinceGroup[] {
  const groups = new Map<string, FarmStory[]>();
  for (const farm of farms) {
    const province = provinceOf(farm.farmRegion);
    if (!province) continue;
    groups.set(province, [...(groups.get(province) ?? []), farm]);
  }
  return [...groups.entries()]
    .map(([province, list]) => ({ province, farms: list }))
    .sort(
      (a, b) =>
        b.farms.length - a.farms.length ||
        a.province.localeCompare(b.province, "ko"),
    );
}

// 이번 달이 제철인 작물을 키우는 농가
export function farmsInSeason(
  farms: FarmStory[],
  seasonByVegetable: Map<string, string>,
  month: number,
): { farm: FarmStory; crops: string[] }[] {
  return farms
    .map((farm) => ({
      farm,
      crops: [
        ...new Set(
          farm.products
            .filter((product) =>
              isInSeason(seasonByVegetable.get(product.vegetableId), month),
            )
            .map((product) => product.vegetableName),
        ),
      ],
    }))
    .filter((item) => item.crops.length > 0);
}

// 판매가와 정상가로 평균 할인율(%)을 계산해요.
export function averageDiscount(
  products: { price: number; originalPrice: number }[],
): number {
  const rates = products
    .filter((product) => product.originalPrice > product.price)
    .map((product) => 1 - product.price / product.originalPrice);
  if (rates.length === 0) return 0;
  return Math.round(
    (rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 100,
  );
}
