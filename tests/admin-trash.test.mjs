import test from "node:test";
import assert from "node:assert/strict";
import { adminReducer } from "../src/lib/admin-store.ts";

const product = {
  id: "carrot",
  name: "흙당근",
  price: 3900,
  imageUrl: "data:image/png;base64,test",
};
const initial = () => ({ products: [product], recipeChanges: {}, trash: [] });
const removeProduct = {
  type: "trash",
  entry: { kind: "product", item: product, deletedAt: "2026-10-23T00:00:00Z" },
};

test("상품 삭제는 원본을 휴지통에 보관하고 복원 시 정보를 유지한다", () => {
  const removed = adminReducer(initial(), removeProduct);
  assert.equal(removed.products.length, 0);
  assert.deepEqual(removed.trash[0].item, product);
  const restored = adminReducer(removed, {
    type: "restore",
    kind: "product",
    id: "carrot",
  });
  assert.deepEqual(restored.products, [product]);
  assert.equal(restored.trash.length, 0);
});
test("중복 삭제·복원과 복원 시 상품 ID 충돌은 데이터를 잃거나 중복 생성하지 않는다", () => {
  const removed = adminReducer(initial(), removeProduct);
  assert.equal(adminReducer(removed, removeProduct).trash.length, 1);
  const restored = adminReducer(removed, {
    type: "restore",
    kind: "product",
    id: "carrot",
  });
  assert.equal(
    adminReducer(restored, { type: "restore", kind: "product", id: "carrot" })
      .products.length,
    1,
  );
  const collision = { ...removed, products: [product] };
  assert.equal(
    adminReducer(collision, { type: "restore", kind: "product", id: "carrot" })
      .trash.length,
    1,
  );
});
test("레시피 삭제·복원은 이미지·재료·조리 순서를 유지한다", () => {
  const recipe = {
    id: "recipe-1",
    name: "당근 라페",
    ingredients: [{ name: "당근", amount: "1개" }],
    steps: ["채 썰기"],
    imageUrl: "photo",
    additionalImageUrls: ["photo2"],
  };
  const removed = adminReducer(initial(), {
    type: "trash",
    entry: { kind: "recipe", item: recipe, deletedAt: "2026-10-23T00:00:00Z" },
  });
  const restored = adminReducer(removed, {
    type: "restore",
    kind: "recipe",
    id: recipe.id,
  });
  assert.deepEqual(restored.recipeChanges[recipe.id], recipe);
  assert.equal(restored.trash.length, 0);
});
test("농가·혜택 항목도 복원 시 원본 정보를 유지한다", () => {
  for (const kind of ["farm", "promotion"]) {
    const item = { id: "sample", name: "예시 항목", description: "원본 정보" };
    const removed = adminReducer(initial(), {
      type: "trash",
      entry: { kind, item, deletedAt: "2026-10-23T00:00:00Z" },
    });
    const restored = adminReducer(removed, {
      type: "restore",
      kind,
      id: item.id,
    });
    assert.deepEqual(restored.otherChanges[`${kind}:${item.id}`], item);
    assert.equal(restored.trash.length, 0);
  }
});
test("휴지통의 상품을 영구 삭제하면 복원할 수 없다", () => {
  const removed = adminReducer(initial(), removeProduct);
  const deleted = adminReducer(removed, {
    type: "permanent-delete",
    kind: "product",
    id: product.id,
  });
  assert.equal(deleted.trash.length, 0);
  assert.equal(deleted.products.length, 0);
  assert.equal(
    adminReducer(deleted, { type: "restore", kind: "product", id: product.id }),
    deleted,
  );
});
test("레시피 영구 삭제는 임시 수정 데이터를 지우고 목록 제외 상태를 유지한다", () => {
  const recipe = { id: "recipe-1", name: "당근 라페" };
  const saved = adminReducer(initial(), { type: "save-recipe", recipe });
  const removed = adminReducer(saved, {
    type: "trash",
    entry: { kind: "recipe", item: recipe, deletedAt: "2026-10-23T00:00:00Z" },
  });
  const deleted = adminReducer(removed, {
    type: "permanent-delete",
    kind: "recipe",
    id: recipe.id,
  });
  assert.equal(deleted.recipeChanges[recipe.id], undefined);
  assert.ok(deleted.deletedKeys.includes(`recipe:${recipe.id}`));
  assert.equal(deleted.trash.length, 0);
});
test("휴지통에 없는 항목은 영구 삭제할 수 없다", () => {
  const state = initial();
  assert.equal(
    adminReducer(state, {
      type: "permanent-delete",
      kind: "product",
      id: product.id,
    }),
    state,
  );
});
test("농가 등록·이름 수정·삭제·복원 후에도 ID와 사진·품목을 유지한다", () => {
  const farm = {
    id: "farm-1",
    name: "새 농가",
    farmName: "새 농가",
    farmRegion: "전라남도 해남",
    imageUrl: "farm-photo",
    additionalImageUrls: ["farm-photo-2", "farm-photo-3"],
    address: "테스트 도로 10",
    latitude: 34.5,
    longitude: 126.5,
    detail: {
      headline: "소개",
      land: "땅과 날씨",
      growing: "재배 방법",
      ugly: "모양이 다른 이유",
      eat: "먹는 법",
      quote: "농장지기 한마디",
    },
    products: [],
    crops: ["당근"],
    story: "농가 소개",
  };
  const saved = adminReducer(initial(), { type: "save-farm", farm });
  const updated = { ...farm, name: "수정 농가", farmName: "수정 농가" };
  const edited = adminReducer(saved, { type: "save-farm", farm: updated });
  assert.equal(Object.keys(edited.otherChanges).length, 1);
  const removed = adminReducer(edited, {
    type: "trash",
    entry: { kind: "farm", item: updated, deletedAt: "2026-10-23T00:00:00Z" },
  });
  const restored = adminReducer(removed, {
    type: "restore",
    kind: "farm",
    id: farm.id,
  });
  assert.deepEqual(restored.otherChanges["farm:farm-1"], updated);
  assert.equal(restored.trash.length, 0);
});
