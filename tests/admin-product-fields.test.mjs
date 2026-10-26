import test from "node:test";
import assert from "node:assert/strict";
import { adminProductName } from "../src/lib/admin-product-fields.ts";

test("관리자 표시명에서 지역 접두사와 용량을 분리하고 원본은 유지한다", () => {
  const product = { name: "해남 흙당근 1kg", farmRegion: "전라남도 해남" };
  assert.equal(adminProductName(product), "흙당근");
  assert.equal(product.name, "해남 흙당근 1kg");
});
test("소수 용량과 수량 단위를 분리한다", () => {
  assert.equal(adminProductName({ name: "가정용 사과 1.5kg" }), "가정용 사과");
  assert.equal(adminProductName({ name: "파프리카 4입" }), "파프리카");
});
test("용량이 없는 이름과 상품명 중간 숫자는 보존한다", () => {
  assert.equal(adminProductName({ name: "1등급 당근" }), "1등급 당근");
  assert.equal(adminProductName({ name: "못난이 토마토" }), "못난이 토마토");
});
