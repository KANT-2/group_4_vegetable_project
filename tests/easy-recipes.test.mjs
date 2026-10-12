import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { createHash } from "node:crypto";
import easy from "../src/data/easy-recipes.json" with { type: "json" };
import official from "../src/data/generated/verified-recipes.json" with { type: "json" };
import { connectCatalogRecipes } from "../src/lib/recipe-catalog.ts";
import {
  recipeVegetableIds,
  mergeRecipeCatalogs,
} from "../src/lib/recipe-relevance.ts";
import { products } from "../src/data/mock/products.ts";
import { vegetables } from "../src/data/mock/vegetables.ts";

test("집밥 24개는 실제 채소 주재료·분량·짧은 단계·대표 사진을 갖는다", async () => {
  assert.equal(easy.length, 24);
  assert.equal(new Set(easy.map((r) => r.id)).size, 24);
  assert.equal(new Set(easy.map((r) => r.primaryVegetableId)).size, 12);
  const refs = new Map(vegetables.map((v) => [v.id, v.name]));
  for (const r of easy) {
    assert.equal(r.difficulty, "easy");
    assert.ok(r.cookTimeMin >= 10 && r.cookTimeMin <= 25);
    assert.equal(r.servings, 2);
    assert.ok(r.ingredients[0].name.includes(refs.get(r.primaryVegetableId)));
    assert.ok(r.steps.length >= 3 && r.steps.length <= 4);
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
    await access(new URL("../public" + r.imageUrl, import.meta.url));
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
  const tomato = recipes.find((r) => r.name === "토마토 양파샐러드");
  assert.deepEqual(recipeVegetableIds(tomato), ["tomato"]);
  assert.ok(tomato.vegetables.some((v) => v.id === "onion"));
  const noProducts = connectCatalogRecipes(easy, [], vegetables);
  assert.ok(
    noProducts.every((r) => r.products.length === 0 && r.vegetables.length > 0),
  );
});

test("편집 레시피를 먼저 표시하고 공식 16개를 보존하며 DB의 같은 ID는 중복 표시하지 않는다", () => {
  const local = connectCatalogRecipes(easy, products, vegetables);
  const db = connectCatalogRecipes(official, products, vegetables);
  const merged = mergeRecipeCatalogs(local, [
    ...db,
    { ...local[0], name: "중복" },
  ]);
  assert.equal(merged.length, 40);
  assert.deepEqual(merged.slice(0, 24), local);
  assert.deepEqual(merged.slice(24), db);
  assert.equal(mergeRecipeCatalogs(local, []).length, 24);
});

test("40개 레시피의 대표 사진은 주소와 실제 파일 내용 모두 중복되지 않는다", async () => {
  const recipes = connectCatalogRecipes([...easy, ...official], [], []);
  assert.equal(new Set(recipes.map((r) => r.imageUrl)).size, 40);
  const hashes = await Promise.all(
    recipes.map(async (r) =>
      createHash("sha256")
        .update(
          await readFile(new URL("../public" + r.imageUrl, import.meta.url)),
        )
        .digest("hex"),
    ),
  );
  assert.equal(new Set(hashes).size, 40);
});
