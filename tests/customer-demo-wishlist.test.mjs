import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDemoWishlist, writeDemoWish } from "../src/lib/customer-demo-wishlist.ts";

test("preview wishlist persists unique products and removes only the selected item", async (t) => {
  const previous = process.env.NODE_ENV;
  const directory = await mkdtemp(join(tmpdir(), "wishlist-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "wishlist.json");
  try {
    process.env.NODE_ENV = "development";
    assert.deepEqual(readDemoWishlist(path), []);
    writeDemoWish("carrot", true, path);
    writeDemoWish("apple", true, path);
    writeDemoWish("carrot", true, path);
    assert.deepEqual(readDemoWishlist(path), ["carrot", "apple"]);
    writeDemoWish("carrot", false, path);
    writeDemoWish("carrot", false, path);
    assert.deepEqual(readDemoWishlist(path), ["apple"]);
    process.env.NODE_ENV = "production";
    assert.throws(() => writeDemoWish("carrot", true, path));
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
