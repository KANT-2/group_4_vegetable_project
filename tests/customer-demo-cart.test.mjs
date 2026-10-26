import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { changeDemoCart, readDemoCart } from "../src/lib/customer-demo-cart.ts";

test("cart persists quantities, merges repeated additions, caps at 99 and removes individual items", async (t) => {
  const previous = process.env.NODE_ENV;
  const directory = await mkdtemp(join(tmpdir(), "cart-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "cart.json");
  try {
    process.env.NODE_ENV = "development";
    assert.equal(changeDemoCart("carrot", "add", 2, path), 2);
    assert.equal(changeDemoCart("carrot", "add", 3, path), 5);
    assert.equal(readDemoCart(path).length, 1);
    assert.equal(changeDemoCart("carrot", "add", 99, path), 99);
    changeDemoCart("apple", "add", 1, path);
    changeDemoCart("carrot", "update", 4, path);
    assert.equal(readDemoCart(path).find((item) => item.productId === "carrot").quantity, 4);
    for (const quantity of [0, -1, 1.5, 100]) assert.throws(() => changeDemoCart("carrot", "update", quantity, path));
    assert.throws(() => changeDemoCart("missing", "update", 1, path));
    changeDemoCart("carrot", "remove", 1, path);
    assert.deepEqual(readDemoCart(path), [{ productId: "apple", quantity: 1 }]);
    process.env.NODE_ENV = "production";
    assert.throws(() => changeDemoCart("apple", "add", 1, path));
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
