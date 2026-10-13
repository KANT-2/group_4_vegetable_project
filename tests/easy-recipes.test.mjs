import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { createHash } from "node:crypto";
import easy from "../src/data/easy-recipes.json" with { type: "json" };
import official from "../src/data/generated/verified-recipes.json" with { type: "json" };
import originalSources from "../docs/recipe-catalog-sources-20261012.json" with { type: "json" };
import addedSources from "../docs/recipe-catalog-sources-20261013.json" with { type: "json" };
import { connectCatalogRecipes } from "../src/lib/recipe-catalog.ts";
import {
  recipeVegetableIds,
  mergeRecipeCatalogs,
} from "../src/lib/recipe-relevance.ts";
import { products } from "../src/data/mock/products.ts";
import { vegetables } from "../src/data/mock/vegetables.ts";

const sources = [...originalSources, ...addedSources];

test("전체 판매 품목 21종마다 레시피 4개와 주재료·분량·조리 순서·사진 3장을 갖는다", async () => {
  assert.equal(easy.length, 84);
  assert.equal(new Set(easy.map((r) => r.id)).size, 84);
  const counts = Map.groupBy(easy, (r) => r.primaryVegetableId);
  assert.deepEqual(
    [...counts.keys()].sort(),
    vegetables.map((v) => v.id).sort(),
  );
  for (const [vegetable, recipes] of counts) {
    assert.equal(recipes.length, 4, vegetable);
  }
  const refs = new Map(vegetables.map((v) => [v.id, v.name]));
  for (const r of easy) {
    assert.ok(["easy", "normal"].includes(r.difficulty));
    assert.ok(Number.isInteger(r.cookTimeMin) && r.cookTimeMin > 0);
    assert.ok(Number.isInteger(r.servings) && r.servings > 0);
    assert.ok(r.ingredients[0].name.includes(refs.get(r.primaryVegetableId)));
    assert.ok(r.steps.length >= 3);
    assert.ok(r.ingredients.every((i) => i.amount));
    for (const v of r.vegetables) {
      assert.equal(refs.get(v.id), v.name);
      assert.ok(r.ingredients.some((i) => i.name === v.name));
    }
    assert.ok(
      r.productVegetableIds.every((id) =>
        r.vegetables.some((v) => v.id === id),
      ),
    );
    const images = [r.imageUrl, ...(r.additionalImageUrls ?? [])];
    assert.equal(new Set(images).size, 3, r.id);
    for (const image of images) {
      await access(new URL("../public" + image, import.meta.url));
    }
    if (r.primaryVegetableId !== "potato") {
      assert.ok(r.sourceUrl.startsWith("https://"));
      assert.ok(r.sourceName);
      assert.ok(
        images.every((image) => image.startsWith("/images/recipes/curated/")),
      );
    }
  }
});

test("판매 중 실제 상품만 연결하고 양념용 채소가 주재료 필터를 차지하지 않는다", () => {
  const fresh = products.map((p) => ({ ...p, id: "db-" + p.id }));
  const inactive = { ...products[0], id: "inactive", isActive: false };
  const recipes = connectCatalogRecipes(easy, [...fresh, inactive], vegetables);
  for (const r of recipes) {
    assert.ok(r.products.length > 0);
    assert.ok(r.products.every((p) => p.id.startsWith("db-")));
    assert.ok(
      r.products.every((p) => r.vegetables.some((v) => v.id === p.vegetableId)),
    );
  }
  const tomato = recipes.find((r) => r.name === "토마토 달걀볶음");
  assert.deepEqual(recipeVegetableIds(tomato), ["tomato"]);
  const soup = recipes.find((r) => r.name === "당근 수프");
  assert.deepEqual(recipeVegetableIds(soup), ["carrot"]);
  assert.ok(soup.vegetables.some((v) => v.id === "onion"));
  const noProducts = connectCatalogRecipes(easy, [], vegetables);
  assert.ok(
    noProducts.every((r) => r.products.length === 0 && r.vegetables.length > 0),
  );
});

test("교체한 과거 DB 목록을 제외해 Mock과 DB 모두 동일한 84개를 표시한다", () => {
  const local = connectCatalogRecipes(easy, products, vegetables);
  const db = connectCatalogRecipes(official, products, vegetables);
  const merged = mergeRecipeCatalogs(local, [
    ...db,
    { ...local[0], name: "중복" },
  ]);
  assert.equal(merged.length, 84);
  assert.deepEqual(merged, local);
  assert.ok(merged.some((r) => r.name === "감자전"));
  assert.ok(merged.some((r) => r.name === "회오리 감자"));
  assert.ok(
    !merged.some((r) => ["official-98711", "official-211734"].includes(r.id)),
  );
  assert.equal(mergeRecipeCatalogs(local, []).length, 84);
  const future = { ...db[0], id: "future-db-recipe" };
  assert.equal(mergeRecipeCatalogs(local, [future]).at(-1), future);
});

test("84개 레시피의 대표 사진은 주소와 실제 파일 내용 모두 중복되지 않는다", async () => {
  const recipes = mergeRecipeCatalogs(
    connectCatalogRecipes(easy, [], []),
    connectCatalogRecipes(official, [], []),
  );
  assert.equal(new Set(recipes.map((r) => r.imageUrl)).size, 84);
  const hashes = await Promise.all(
    recipes.map(async (r) =>
      createHash("sha256")
        .update(
          await readFile(new URL("../public" + r.imageUrl, import.meta.url)),
        )
        .digest("hex"),
    ),
  );
  assert.equal(new Set(hashes).size, 84);
});

test("원작자 레시피 80개의 원문과 사진 출처 기록이 실제 표시 파일에 대응한다", async () => {
  assert.equal(originalSources.length, 48);
  assert.equal(addedSources.length, 32);
  assert.deepEqual(
    sources.map((s) => s.recipeId).sort(),
    easy
      .filter((r) => r.primaryVegetableId !== "potato")
      .map((r) => r.id)
      .sort(),
  );
  for (const source of sources) {
    const recipe = easy.find((r) => r.id === source.recipeId);
    assert.equal(source.name, recipe.name);
    assert.equal(source.sourceUrl, recipe.sourceUrl);
    assert.deepEqual(
      source.photos.map((photo) => photo.imageUrl),
      [recipe.imageUrl, ...recipe.additionalImageUrls],
    );
    for (const photo of source.photos) {
      assert.ok(photo.originalUrl.startsWith("https://"));
      // 원문 조리 사진의 최소 크기. 150px 썸네일·아이콘 혼입을 막는다.
      assert.ok(Math.min(photo.width, photo.height) >= 250);
      assert.ok(Math.max(photo.width, photo.height) >= 400);
      const bytes = await readFile(
        new URL("../public" + photo.imageUrl, import.meta.url),
      );
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        photo.sha256,
      );
    }
  }
});

test("실제 판매 상품의 모든 품목이 주재료 필터와 4개 레시피에 포함된다", () => {
  const displayed = mergeRecipeCatalogs(
    connectCatalogRecipes(easy, products, vegetables),
    connectCatalogRecipes(official, products, vegetables),
  );
  const menu = new Set(displayed.flatMap(recipeVegetableIds));
  const activeVegetables = new Set(
    products.filter((p) => p.isActive).map((p) => p.vegetableId),
  );
  assert.deepEqual([...menu].sort(), vegetables.map((v) => v.id).sort());
  for (const id of activeVegetables) {
    assert.ok(menu.has(id), `판매 품목 ${id}가 필터에서 누락됨`);
    assert.equal(
      displayed.filter((r) => recipeVegetableIds(r).includes(id)).length,
      4,
      id,
    );
  }
});
