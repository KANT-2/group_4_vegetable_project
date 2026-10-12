import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"));
const catalog = read("data/food-catalog/nutrition.json");
const extra = read("data/nutrition/fct-2006-b.json");
const aliases = { paprika: "bell-pepper" };

// 앱 채소 21종 ID (Mock 데이터 = DB seed 기준)
const vegetableIds = [
  ...readFileSync(
    new URL("../src/data/mock/vegetables.ts", import.meta.url),
    "utf8",
  ).matchAll(/^\s*id: "([a-z-]+)",$/gm),
].map((match) => match[1]);

test("채소 21종 모두 영양 정보가 1개 이상 있다", () => {
  assert.equal(vegetableIds.length, 21);
  const covered = new Set(
    [...catalog, ...extra].map((row) => row.vegetable_id),
  );
  for (const id of vegetableIds) {
    assert.ok(covered.has(aliases[id] ?? id), `${id} 영양 정보 없음`);
  }
});

test("B 파일은 A 카탈로그와 겹치지 않고 같은 출처·기준을 쓴다", () => {
  const catalogVegetables = new Set(catalog.map((row) => row.vegetable_id));
  const ids = new Set([...catalog, ...extra].map((row) => row.id));
  assert.equal(ids.size, catalog.length + extra.length, "식품번호 중복");
  for (const row of extra) {
    assert.ok(!catalogVegetables.has(row.vegetable_id), row.vegetable_id);
    assert.equal(row.source_id, "fct-2006");
    assert.equal(row.edition, 2006);
    assert.equal(row.basis_g, 100);
    assert.equal(row.form, "raw");
    assert.match(row.food_code, /^\d{5}$/);
  }
});

test("영양 값은 0 이상이고, 미량이면 값을 비워 둔다", () => {
  const fields = [
    "energy_kcal",
    "carbohydrate_g",
    "protein_g",
    "fat_g",
    "sodium_mg",
    "potassium_mg",
    "calcium_mg",
    "iron_mg",
    "vitamin_c_mg",
    "beta_carotene_ug",
  ];
  for (const row of extra) {
    for (const field of fields) {
      const value = row[field];
      assert.ok(value === null || value >= 0, `${row.id} ${field}`);
    }
    if (row.fat_value_status === "trace") assert.equal(row.fat_g, null);
    if (row.vitamin_c_value_status === "trace")
      assert.equal(row.vitamin_c_mg, null);
  }
});
