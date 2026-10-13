import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getProductImages } from "../src/lib/product-gallery.ts";
import { products } from "../src/data/mock/products.ts";
import selected from "../src/data/product-photo-overrides.json" with { type: "json" };
import sources from "../docs/product-photo-sources-20261013.json" with { type: "json" };

test("67개 판매 상품은 서로 다른 대표사진과 상품별 사진 구성을 갖는다", async () => {
  const hashes = new Map();
  const primaryHashes = new Set();
  const combinations = new Set();
  const active = products.filter((p) => p.isActive);
  assert.deepEqual(
    Object.keys(selected).sort(),
    active.map((p) => p.id).sort(),
  );
  assert.equal(active.length, 67);
  for (const product of active) {
    const photos = getProductImages(product);
    assert.equal(photos.length, 3, product.id);
    assert.deepEqual(photos, selected[product.id]);
    assert.deepEqual(
      getProductImages({
        ...product,
        imageUrl: "https://example.supabase.co/old.jpg",
      }),
      photos,
    );
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
    primaryHashes.add(hashes.get(photos[0]));
    combinations.add(
      photos
        .map((path) => hashes.get(path))
        .sort()
        .join("/"),
    );
  }
  assert.equal(primaryHashes.size, active.length);
  assert.equal(combinations.size, active.length);
});

test("상품 사진 출처 기록은 품목·파일 해시·연결 상품과 일치한다", async () => {
  assert.equal(sources.productCount, 67);
  assert.equal(sources.productPhotoSlots, 201);
  assert.equal(sources.uniquePhotos, sources.photos.length);
  assert.equal(
    sources.pinterestPhotos,
    sources.photos.filter((p) => p.sourceKind === "pinterest").length,
  );
  for (const source of sources.photos) {
    const bytes = await readFile(
      new URL("../public" + source.imageUrl, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      source.sha256,
    );
    for (const id of source.productIds) {
      assert.ok(selected[id].includes(source.imageUrl));
      assert.equal(
        products.find((p) => p.id === id).vegetableId,
        source.vegetableId,
      );
    }
    if (source.sourceKind === "pinterest") {
      assert.match(source.pinUrl, /^https:\/\/[a-z.]*pinterest\.com\/pin\//);
      assert.match(source.pinterestImageUrl, /^https:\/\/i\.pinimg\.com\//);
      assert.ok(Math.min(source.width, source.height) >= 250);
      assert.ok(Math.max(source.width, source.height) >= 400);
    }
  }
  for (const row of sources.products)
    assert.deepEqual(row.images, selected[row.productId]);
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
