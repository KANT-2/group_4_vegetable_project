import test from "node:test";
import assert from "node:assert/strict";
import { recipeImageError } from "../src/lib/recipe-image-validation.ts";

const image = { type: "image/png", size: 1024 };
test("레시피 사진 3장까지 허용하고 추가 선택 시에도 총 3장 제한을 적용한다", () => {
  assert.equal(recipeImageError(0, [image, image, image]), "");
  assert.notEqual(recipeImageError(2, [image, image]), "");
  assert.notEqual(recipeImageError(0, [image, image, image, image]), "");
});
test("지원하지 않는 형식과 5MB 초과 이미지는 거부한다", () => {
  assert.notEqual(
    recipeImageError(0, [{ type: "image/svg+xml", size: 100 }]),
    "",
  );
  assert.notEqual(
    recipeImageError(0, [{ ...image, size: 5 * 1024 * 1024 + 1 }]),
    "",
  );
  assert.equal(recipeImageError(0, [{ ...image, size: 5 * 1024 * 1024 }]), "");
});
