import assert from "node:assert/strict";
import test from "node:test";
import {
  GUEST_CART_MAX_LINES,
  changeGuestCart,
  guestCartCount,
  parseGuestCart,
  serializeGuestCart,
} from "../src/lib/guest-cart-core.ts";

const carrot = "carrot-bent-1kg";
const apple = "apple-small-3kg";

test("비어 있거나 망가진 쿠키는 빈 장바구니로 읽는다", () => {
  for (const raw of [
    undefined,
    null,
    "",
    "not json",
    "{}",
    "123",
    '"x"',
    "null",
  ])
    assert.deepEqual(parseGuestCart(raw), []);
});

test("쿠키에 저장했다가 그대로 읽는다", () => {
  const items = [
    { productId: carrot, quantity: 2 },
    { productId: apple, quantity: 1 },
  ];
  assert.deepEqual(parseGuestCart(serializeGuestCart(items)), items);
});

test("사람이 고친 값은 올바른 줄만 남기고 버린다", () => {
  const tampered = JSON.stringify([
    { p: carrot, q: 2 },
    { p: carrot, q: 5 }, // 같은 상품 중복
    { p: "Bad ID!", q: 1 },
    { p: "../etc/passwd", q: 1 },
    { p: apple, q: 0 },
    { p: apple, q: 100 },
    { p: apple, q: 1.5 },
    { p: apple, q: "3" },
    { p: apple },
    { q: 3 },
    null,
    "x",
    { p: "x".repeat(101), q: 1 },
    { p: "orange-1kg", q: 99 },
  ]);
  assert.deepEqual(parseGuestCart(tampered), [
    { productId: carrot, quantity: 2 },
    { productId: "orange-1kg", quantity: 99 },
  ]);
});

test("쿠키로 읽는 줄 수는 제한된다", () => {
  const many = Array.from({ length: 80 }, (_, i) => ({ p: `item-${i}`, q: 1 }));
  assert.equal(
    parseGuestCart(JSON.stringify(many)).length,
    GUEST_CART_MAX_LINES,
  );
});

test("담기: 새 상품은 맨 위에, 같은 상품은 수량을 더한다", () => {
  let result = changeGuestCart([], carrot, "add", 2);
  assert.deepEqual(result, {
    ok: true,
    items: [{ productId: carrot, quantity: 2 }],
    quantity: 2,
  });
  result = changeGuestCart(result.items, apple, "add", 1);
  assert.deepEqual(
    result.items.map((i) => i.productId),
    [apple, carrot],
  );
  result = changeGuestCart(result.items, carrot, "add", 3);
  assert.equal(result.quantity, 5);
  assert.deepEqual(
    result.items.map((i) => [i.productId, i.quantity]),
    [
      [carrot, 5],
      [apple, 1],
    ],
  );
});

test("합쳐서 99를 넘으면 자르지 않고 거부하며 원래 값은 그대로다", () => {
  const items = [{ productId: carrot, quantity: 98 }];
  const result = changeGuestCart(items, carrot, "add", 2);
  assert.equal(result.ok, false);
  assert.deepEqual(items, [{ productId: carrot, quantity: 98 }]);
  assert.equal(changeGuestCart(items, carrot, "add", 1).ok, true);
});

test("잘못된 수량·상품 ID는 거부한다", () => {
  for (const quantity of [0, -1, 100, 1.5, "2", null, NaN, Infinity])
    assert.equal(
      changeGuestCart([], carrot, "add", quantity).ok,
      false,
      String(quantity),
    );
  for (const id of ["", "UPPER", "a b", "a--b", "-a", "a-", "x".repeat(101)])
    assert.equal(changeGuestCart([], id, "add", 1).ok, false, id);
});

test("수량 변경: 있는 상품만, 값을 그대로 바꾼다", () => {
  const items = [{ productId: carrot, quantity: 2 }];
  assert.equal(changeGuestCart(items, apple, "update", 3).ok, false);
  const result = changeGuestCart(items, carrot, "update", 7);
  assert.deepEqual(result, {
    ok: true,
    items: [{ productId: carrot, quantity: 7 }],
    quantity: 7,
  });
  assert.equal(changeGuestCart(items, carrot, "update", 0).ok, false);
});

test("삭제: 없는 상품을 지워도 오류가 아니다", () => {
  const items = [{ productId: carrot, quantity: 2 }];
  assert.deepEqual(changeGuestCart(items, carrot, "remove"), {
    ok: true,
    items: [],
    quantity: 0,
  });
  assert.deepEqual(changeGuestCart(items, apple, "remove").items, items);
});

test("상품 종류 수 제한", () => {
  const full = Array.from({ length: GUEST_CART_MAX_LINES }, (_, i) => ({
    productId: `item-${i}`,
    quantity: 1,
  }));
  assert.equal(changeGuestCart(full, "brand-new", "add", 1).ok, false);
  assert.equal(changeGuestCart(full, "item-3", "add", 1).ok, true); // 이미 있는 상품은 더할 수 있다
});

test("헤더에 보일 개수는 수량의 합이다", () => {
  assert.equal(guestCartCount([]), 0);
  assert.equal(
    guestCartCount([
      { productId: carrot, quantity: 2 },
      { productId: apple, quantity: 5 },
    ]),
    7,
  );
});
