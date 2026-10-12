import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import {
  rankProducts,
  pickRecommended,
  selectSeasonalFruit,
} from "../src/lib/product-ranking.ts";
import { products } from "../src/data/mock/products.ts";
import catalog from "../src/data/generated/verified-recipes.json" with { type: "json" };
import { connectCatalogRecipes } from "../src/lib/recipe-catalog.ts";
import { withRecipePhoto } from "../src/lib/recipe-photos.ts";

test("추천은 운영 추천·제철·정확한 할인율·가격 순이며 원본과 판매 종료 상품을 보존한다", () => {
  const base = {
    price: 900,
    originalPrice: 1000,
    isFeatured: false,
    isSeasonal: false,
    reviewCount: 0,
    isActive: true,
    vegetableId: "apple",
  };
  const values = [
    { ...base, id: "d" },
    { ...base, id: "c", isSeasonal: true },
    { ...base, id: "b", isFeatured: true },
    { ...base, id: "a", isActive: false },
  ];
  const original = structuredClone(values);
  assert.deepEqual(
    rankProducts(values).map((x) => x.id),
    ["b", "c", "a", "d"],
  );
  assert.ok(pickRecommended(values).every((x) => x.isActive));
  assert.deepEqual(values, original);
  const discounts = [
    { ...base, id: "low", price: 667, originalPrice: 1000 },
    { ...base, id: "high", price: 665, originalPrice: 1000 },
  ];
  assert.equal(rankProducts(discounts, "discount_desc")[0].id, "high");
});
test("제철 배너는 판매 중 제철 과일만 선택하고 빈 목록을 허용한다", () => {
  const fruit = products.slice(0, 4).map((p, i) => ({
    ...p,
    id: String(i),
    category: i === 0 ? "root" : "fruit",
    isSeasonal: i !== 2,
    isActive: i !== 3,
  }));
  assert.deepEqual(
    selectSeasonalFruit(fruit).map((p) => p.id),
    ["1"],
  );
  assert.deepEqual(selectSeasonalFruit([]), []);
});
test("16개 참고 사진은 출처·작가·라이선스와 실제 파일을 갖고 DB의 실제 사진을 덮어쓰지 않는다", async () => {
  const recipes = connectCatalogRecipes(catalog, products, []);
  assert.equal(recipes.length, 16);
  for (const recipe of recipes) {
    const p = recipe.photoReference;
    assert.ok(p && p.author && p.license);
    assert.match(p.source, /^https:\/\/commons.wikimedia.org\//);
    assert.match(p.licenseUrl, /^https?:\/\/creativecommons.org\//);
    await access(new URL("../public" + p.imageUrl, import.meta.url));
  }
  const actual = {
    ...recipes[0],
    imageUrl: "https://example.org/actual.jpg",
    photoReference: undefined,
  };
  assert.equal(withRecipePhoto(actual), actual);
  const manifest = JSON.parse(
    await readFile(
      new URL("../src/data/recipe-photo-assets.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(Object.keys(manifest).length, 10);
});
