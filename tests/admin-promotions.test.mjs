import test from "node:test";
import assert from "node:assert/strict";
import { adminReducer } from "../src/lib/admin-store.ts";
import { managedPromotions, safePromotionHref } from "../src/lib/admin-promotions.ts";

test("editing, trashing, restoring and permanently deleting a notice preserves its content", () => {
  let state = { products: [], recipeChanges: {}, trash: [] };
  const original = managedPromotions(state)[0];
  const edited = { ...original, name: "수정 공지", title: "수정 공지", published: false, notes: ["유의사항 수정"] };
  state = adminReducer(state, { type: "save-promotion", promotion: edited });
  assert.deepEqual(managedPromotions(state).find((p) => p.id === edited.id), edited);
  state = adminReducer(state, { type: "trash", entry: { kind: "promotion", item: edited, deletedAt: "2026-10-25T00:00:00Z" } });
  assert.equal(managedPromotions(state).some((p) => p.id === edited.id), false);
  state = adminReducer(state, { type: "restore", kind: "promotion", id: edited.id });
  assert.deepEqual(managedPromotions(state).find((p) => p.id === edited.id), edited);
  state = adminReducer(state, { type: "trash", entry: { kind: "promotion", item: edited, deletedAt: "2026-10-25T00:00:00Z" } });
  state = adminReducer(state, { type: "permanent-delete", kind: "promotion", id: edited.id });
  assert.equal(managedPromotions(state).some((p) => p.id === edited.id), false);
});

test("a newly registered notice appears once with the full body", () => {
  const state = { products: [], recipeChanges: {}, trash: [] };
  const item = { ...managedPromotions(state)[0], id: "new-notice", slug: "new-notice" };
  const saved = adminReducer(state, { type: "save-promotion", promotion: item });
  const updated = adminReducer(saved, { type: "save-promotion", promotion: item });
  assert.equal(managedPromotions(updated).filter((p) => p.id === item.id).length, 1);
  assert.deepEqual(managedPromotions(updated).find((p) => p.id === item.id).facts, item.facts);
});

test("notice buttons only allow internal destinations", () => {
  assert.equal(safePromotionHref("/products?q=배추"), true);
  for (const value of ["", "javascript:alert(1)", "//example.com", "/\\example.com", "/\n/example.com", "https://example.com"]) {
    assert.equal(safePromotionHref(value), false);
  }
});
