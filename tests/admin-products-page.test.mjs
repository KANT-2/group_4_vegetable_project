import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// 관리자 상품관리는 서현 님이 만든 AdminProducts 화면(등록·검색·필터·휴지통)을 그대로 써요.
// 실제 DB 모드에서도 다른 화면으로 바꾸지 말고, 저장 경로(src/lib/admin-catalog-sync.ts)를 고쳐 주세요.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("관리자 상품관리 페이지는 원래 AdminProducts 화면을 그대로 그린다", async () => {
  const page = await read("src/app/admin/page.tsx");
  assert.match(page, /<AdminProducts\s*\/>/);
  assert.doesNotMatch(page, /<AdminProducts>/);
  assert.doesNotMatch(page, /CatalogProductManager/);
});

test("원래 화면의 상품 등록·검색·수정·휴지통 기능이 남아 있다", async () => {
  const source = await read("src/components/admin/AdminProducts.tsx");
  for (const feature of [
    "<RegisterProduct",
    'id="admin-search"',
    "<ProductForm",
    "moveToTrash",
    '"재고"',
  ])
    assert.ok(source.includes(feature), `${feature} 가 없어요`);
});

test("실제 DB 모드의 관리자 저장은 Supabase(FastAPI)로 보낸다", async () => {
  const route = await read("src/app/api/managed-content/route.ts");
  assert.match(route, /applyCatalogAction/);
  assert.match(route, /withCatalogProducts/);
});
