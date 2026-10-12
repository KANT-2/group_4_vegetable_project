import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getProductImages } from "../src/lib/product-gallery.ts";
import { products } from "../src/data/mock/products.ts";

test("판매 상품마다 현재 대표사진을 유지하고 같은 작물의 서로 다른 사진 3장을 제공한다", async () => {
  const hashes = new Map();
  for (const product of products.filter((p) => p.isActive)) {
    const photos = getProductImages(product);
    assert.equal(photos.length, 3, product.id);
    assert.equal(photos[0], product.imageUrl);
    assert.equal(new Set(photos).size, 3);
    for (const path of photos) {
      if (!hashes.has(path))
        hashes.set(
          path,
          createHash("sha256")
            .update(
              await readFile(new URL("../public" + path, import.meta.url)),
            )
            .digest("hex"),
        );
    }
    assert.equal(
      new Set(photos.map((path) => hashes.get(path))).size,
      3,
      product.id,
    );
  }
});

test("Supabase 사진과 로컬 사진의 파일명이 같으면 같은 장을 중복 추가하지 않는다", () => {
  const primary =
    "https://example.supabase.co/storage/v1/object/public/market-images/products/carrot.jpg?version=2";
  const photos = getProductImages({ vegetableId: "carrot", imageUrl: primary });
  assert.equal(photos.length, 3);
  assert.equal(photos[0], primary);
  assert.ok(!photos.slice(1).includes("/images/carrot.jpg"));
  assert.deepEqual(
    getProductImages({
      vegetableId: "new-crop",
      imageUrl: "/images/custom.jpg",
    }),
    ["/images/custom.jpg"],
  );
  assert.deepEqual(getProductImages({ vegetableId: "new-crop" }), []);
});
