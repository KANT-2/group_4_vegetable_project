import assert from "node:assert/strict";
import test from "node:test";
import { loadActions } from "./cart-actions-loader.mjs";
import { summarizeCart } from "../src/lib/cart.ts";

// src/actions/cart.ts를 가짜 Supabase로 실행해요. (예전 Supabase 로그인 경로)
// 아주 작은 가짜 DB: cart_items, wishlist_items, products(판매 중 목록)
function fakeDb({ active = ["carrot-1kg"], cart = [], wish = [] } = {}) {
  const tables = { cart_items: cart, wishlist_items: wish };
  const calls = [];
  const query = (table) => {
    const filters = {};
    let op = "select";
    let payload;
    const rows = () =>
      (tables[table] ?? []).filter((r) =>
        Object.entries(filters).every(([k, v]) => r[k] === v),
      );
    const run = () => {
      calls.push({ table, op, filters: { ...filters }, payload });
      if (op === "update") {
        rows().forEach((r) => Object.assign(r, payload));
        return { error: null };
      }
      if (op === "delete") {
        tables[table] = tables[table].filter((r) => !rows().includes(r));
        return { error: null };
      }
      return { error: null };
    };
    const builder = {
      select: () => builder,
      update: (p) => ((op = "update"), (payload = p), builder),
      delete: () => ((op = "delete"), builder),
      eq: (k, v) => ((filters[k] = v), builder),
      maybeSingle: async () => {
        if (table === "products")
          return {
            data:
              filters.is_active && active.includes(filters.id)
                ? { id: filters.id }
                : null,
            error: null,
          };
        return { data: rows()[0] ?? null, error: null };
      },
      then: (resolve) => resolve(run()),
      insert: async (p) => {
        calls.push({ table, op: "insert", payload: p });
        const dup = tables[table].some(
          (r) => r.user_id === p.user_id && r.product_id === p.product_id,
        );
        if (dup) return { error: { code: "23505" } };
        tables[table].push({ ...p });
        return { error: null };
      },
    };
    return builder;
  };
  return { from: query, tables, calls };
}

test("장바구니 담기: 새 상품은 추가, 같은 상품은 수량을 더하고 99개를 넘지 않는다", async () => {
  const db = fakeDb();
  const { addToCart } = loadActions({ db });
  const first = await addToCart({ product_id: "carrot-1kg", quantity: 2 });
  assert.deepEqual(first, { ok: true, quantity: 2 });
  const second = await addToCart({ product_id: "carrot-1kg", quantity: 3 });
  assert.deepEqual(second, { ok: true, quantity: 5 });
  db.tables.cart_items[0].quantity = 98;
  const capped = await addToCart({ product_id: "carrot-1kg", quantity: 5 });
  assert.deepEqual(capped, { ok: true, quantity: 99 });
  assert.equal(db.tables.cart_items.length, 1);
  assert.equal(db.tables.cart_items[0].user_id, "me");
});

test("장바구니 담기: 판매 중이 아닌 상품·잘못된 수량은 저장하지 않고 비회원 찜은 로그인이 필요하다", async () => {
  const db = fakeDb();
  const { addToCart } = loadActions({ db });
  assert.equal(
    (await addToCart({ product_id: "gone-1kg", quantity: 1 })).ok,
    false,
  );
  assert.equal(
    (await addToCart({ product_id: "carrot-1kg", quantity: 0 })).ok,
    false,
  );
  assert.equal(
    (await addToCart({ product_id: "carrot-1kg", quantity: 100 })).ok,
    false,
  );
  assert.equal(
    (await addToCart({ product_id: "Bad ID", quantity: 1 })).ok,
    false,
  );
  assert.equal(db.tables.cart_items.length, 0);

  // 비회원은 장바구니에 담을 수 있지만(쿠키), 찜은 로그인이 필요해요. (비회원 장바구니는 tests/cart-modes.test.mjs)
  const guestActions = loadActions({ user: null, db });
  const wish = await guestActions.setWishlist({
    product_id: "carrot-1kg",
    wished: true,
  });
  assert.equal(wish.ok, false);
  assert.equal(wish.needsLogin, true);
  assert.equal(db.tables.wishlist_items.length, 0);
});

test("수량 수정·삭제·찜은 항상 로그인 사용자 기준으로만 바뀐다", async () => {
  const db = fakeDb({
    cart: [
      { user_id: "me", product_id: "carrot-1kg", quantity: 1 },
      { user_id: "other", product_id: "carrot-1kg", quantity: 7 },
    ],
  });
  const { updateCartQuantity, removeFromCart, setWishlist } = loadActions({
    db,
  });
  assert.equal(
    (await updateCartQuantity({ product_id: "carrot-1kg", quantity: 4 })).ok,
    true,
  );
  assert.deepEqual(
    db.tables.cart_items.map((r) => [r.user_id, r.quantity]),
    [
      ["me", 4],
      ["other", 7],
    ],
  );
  // 다른 사용자 ID를 넣어도 거부(strict schema)
  assert.equal(
    (await removeFromCart({ product_id: "carrot-1kg", user_id: "other" })).ok,
    false,
  );
  assert.equal((await removeFromCart({ product_id: "carrot-1kg" })).ok, true);
  assert.deepEqual(
    db.tables.cart_items.map((r) => r.user_id),
    ["other"],
  );

  // 찜: 중복 찜(23505)도 성공, 해제는 내 것만
  assert.equal(
    (await setWishlist({ product_id: "carrot-1kg", wished: true })).ok,
    true,
  );
  assert.equal(
    (await setWishlist({ product_id: "carrot-1kg", wished: true })).ok,
    true,
  );
  assert.equal(db.tables.wishlist_items.length, 1);
  assert.equal(
    (await setWishlist({ product_id: "carrot-1kg", wished: false })).ok,
    true,
  );
  assert.equal(db.tables.wishlist_items.length, 0);
});

test("합계는 판매 중인 상품만 계산하고 할인액을 정확히 낸다", () => {
  const base = { unit: "1kg", imageUrl: undefined };
  const summary = summarizeCart([
    {
      ...base,
      productId: "a",
      name: "A",
      quantity: 2,
      available: true,
      price: 2900,
      originalPrice: 4800,
    },
    {
      ...base,
      productId: "b",
      name: "B",
      quantity: 1,
      available: true,
      price: 4900,
      originalPrice: 7900,
    },
    {
      ...base,
      productId: "c",
      name: "C",
      quantity: 3,
      available: false,
      price: 0,
      originalPrice: 0,
    },
  ]);
  assert.deepEqual(summary, {
    kinds: 2,
    quantity: 3,
    originalTotal: 17500,
    discount: 6800,
    total: 10700,
    shippingFee: 3500,
    orderTotal: 14200,
    unavailable: 1,
  });
});

test("배송비는 할인 후 상품금액 20,000원 경계를 적용하고 빈 장바구니는 0원이다", () => {
  const line = {
    productId: "a",
    name: "A",
    unit: "1kg",
    quantity: 1,
    available: true,
    originalPrice: 30000,
  };
  for (const [price, fee] of [
    [19999, 3500],
    [20000, 0],
    [20001, 0],
  ]) {
    const result = summarizeCart([{ ...line, price }]);
    assert.equal(result.shippingFee, fee);
    assert.equal(result.orderTotal, price + fee);
  }
  assert.equal(summarizeCart([]).orderTotal, 0);
});
