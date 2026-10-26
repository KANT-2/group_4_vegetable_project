import test from "node:test";
import assert from "node:assert/strict";
import { recipeSearchVegetable } from "../src/lib/admin-recipe-search.ts";

const options = [
  { id: "onion", name: "양파" },
  { id: "eggplant", name: "가지" },
  { id: "cabbage", name: "양배추" },
  { id: "napa", name: "배추" },
];
test("검색어에 맞춰 재료 메뉴를 선택하며 공백도 무시한다", () => {
  assert.equal(recipeSearchVegetable("가지구이", options), "eggplant");
  assert.equal(recipeSearchVegetable(" 양 파 볶음 ", options), "onion");
  assert.equal(recipeSearchVegetable("양배추 볶음", options), "cabbage");
});
test("재료가 없거나 여러 재료가 언급되면 전체 검색으로 전환한다", () => {
  assert.equal(recipeSearchVegetable("간장조림", options), "");
  assert.equal(recipeSearchVegetable("양파 가지 볶음", options), "");
  assert.equal(recipeSearchVegetable("", options), "");
});
