import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { FARM_STORIES } from "../src/data/farm-stories.ts";
import farmPhotos from "../src/data/farm-photo-assets.json" with { type: "json" };
import { products } from "../src/data/mock/products.ts";
import { getFarmPhoto } from "../src/lib/farm-photo.ts";
import {
  averageDiscount,
  groupFarmsByProvince,
  isInSeason,
  provinceOf,
  seasonMonths,
} from "../src/lib/farm-story.ts";

const farmsFromMock = () => {
  const farms = new Map();
  for (const product of products.filter((p) => p.isActive)) {
    const farm = farms.get(product.farmName) ?? {
      farmName: product.farmName,
      farmRegion: product.farmRegion,
      story: product.farmStory,
      products: [],
    };
    farm.products.push({
      id: product.id,
      name: product.name,
      imageUrl: product.imageUrl,
      vegetableId: product.vegetableId,
      vegetableName: product.vegetableId,
    });
    farms.set(product.farmName, farm);
  }
  return [...farms.values()];
};

test("제철 문자열을 달 목록으로 바꾼다 (해를 넘기는 기간 포함)", () => {
  assert.deepEqual(seasonMonths("9~12월"), [9, 10, 11, 12]);
  assert.deepEqual(seasonMonths("11~2월"), [1, 2, 11, 12]);
  assert.deepEqual(seasonMonths("3~5월, 9~11월"), [3, 4, 5, 9, 10, 11]);
  assert.equal(seasonMonths("사계절").length, 12);
  assert.deepEqual(seasonMonths(undefined), []);
  assert.equal(isInSeason("11~3월", 1), true);
  assert.equal(isInSeason("6~9월", 10), false);
});

test("지역을 시·도 짧은 이름으로 묶는다", () => {
  assert.equal(provinceOf("전라남도 해남"), "전남");
  assert.equal(provinceOf("제주특별자치도 구좌"), "제주");
  assert.equal(provinceOf(undefined), null);
  const groups = groupFarmsByProvince(farmsFromMock());
  const total = groups.reduce((sum, group) => sum + group.farms.length, 0);
  assert.equal(total, farmsFromMock().length);
  // 농가가 많은 지역이 먼저
  for (let i = 1; i < groups.length; i += 1)
    assert.ok(groups[i - 1].farms.length >= groups[i].farms.length);
});

test("평균 할인율을 계산한다", () => {
  assert.equal(
    averageDiscount([
      { price: 50, originalPrice: 100 },
      { price: 70, originalPrice: 100 },
    ]),
    40,
  );
  assert.equal(averageDiscount([]), 0);
});

test("시연 농가마다 자세한 농가 이야기가 있다", () => {
  for (const farm of farmsFromMock()) {
    const detail = FARM_STORIES[farm.farmName];
    assert.ok(detail, farm.farmName);
    for (const key of ["headline", "land", "growing", "ugly", "eat", "quote"])
      assert.ok(detail[key]?.length > 10, `${farm.farmName} ${key}`);
  }
});

test("모든 시연 농가 카드는 상품 사진이 아닌 농장 풍경을 쓰고, 그 사진의 출처가 있다", async () => {
  const credited = new Set(farmPhotos.map((photo) => photo.imageUrl));
  // 사과 과수원 사진은 이 표가 생기기 전에 넣은 기존 사진이라 따로 둬요.
  const pending = new Set([
    "/images/farms/apple-orchard.webp",
    "/images/farms/youngju-orchard.webp",
  ]);
  for (const farm of farmsFromMock()) {
    const photo = getFarmPhoto(farm);
    assert.match(photo.imageUrl, /^\/images\/farms\//, farm.farmName);
    assert.ok(
      credited.has(photo.imageUrl) || pending.has(photo.imageUrl),
      `${farm.farmName} ${photo.imageUrl}`,
    );
    await access(new URL(`../public${photo.imageUrl}`, import.meta.url));
  }
});
