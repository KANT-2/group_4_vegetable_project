import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import { checkoutShippingSchema } from "../src/schemas/shipping.ts";
import { shippingFeeFor } from "../src/lib/cart.ts";

class FastApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const userId = "00000000-0000-4000-8000-000000000001";
const key = "00000000-0000-4000-8000-000000000099";
const input = (overrides = {}) => ({
  paymentMethod: "easy_pay",
  userId,
  requestKey: key,
  shipping: {
    recipient_name: "테스트회원",
    recipient_phone: "010-1234-5678",
    postal_code: "01234",
    address: "테스트 가상 주소",
    address_detail: "테스트 상세주소",
  },
  items: [
    { product_id: "carrot-1kg", quantity: 2, unit_price: 2900 },
    { product_id: "apple-2kg", quantity: 1, unit_price: 12900 },
  ],
  success: true,
  ...overrides,
});

function load({ mode, place, unavailable = false }) {
  const calls = [];
  const paths = [];
  const modules = {
    zod: { z },
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "@/lib/auth": { getCurrentUser: async () => null },
    "@/schemas/shipping": { checkoutShippingSchema },
    "@/lib/supabase/server": {
      createClient: async () => {
        throw new Error("FastAPI 주문은 Supabase 를 부르면 안 돼요");
      },
    },
    "@/lib/managed-content": { productUnavailable: () => unavailable },
    "@/lib/cart-mode": { getCartMode: async () => mode },
    "@/lib/cart-api": {
      apiPlaceOrder: async (token, body) => {
        calls.push({ token, body });
        return place ? place() : { id: "order-1" };
      },
    },
    "@/lib/cart": { shippingFeeFor },
    "@/lib/fastapi": { FastApiError },
  };
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/actions/checkout.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  const exports = {};
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  return { ...exports, calls, paths };
}

const fastapi = { kind: "fastapi", token: "TOKEN", userId };

test("FastAPI 주문: 토큰·요청 키·배송지·결제 수단·화면 금액을 보내고 주문 번호를 돌려준다", async () => {
  const { mockCheckout, calls, paths } = load({ mode: fastapi });
  assert.deepEqual(await mockCheckout(input()), {
    ok: true,
    orderId: "order-1",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].token, "TOKEN");
  assert.deepEqual(calls[0].body, {
    request_key: key,
    shipping: {
      recipient_name: "테스트회원",
      recipient_phone: "01012345678", // 하이픈은 정리해서 보낸다
      postal_code: "01234",
      address: "테스트 가상 주소",
      address_detail: "테스트 상세주소",
    },
    payment_method: "easy_pay",
    expected_total_amount: 22200, // 5,800 + 12,900 = 18,700 + 배송비 3,500
  });
  assert.deepEqual(paths.sort(), ["/cart", "/mypage/orders"]);
});

test("FastAPI 주문: 2만원 이상이면 배송비 없이 화면 금액을 보낸다", async () => {
  const { mockCheckout, calls } = load({ mode: fastapi });
  await mockCheckout(
    input({
      items: [{ product_id: "apple-2kg", quantity: 2, unit_price: 12900 }],
    }),
  );
  assert.equal(calls[0].body.expected_total_amount, 25800);
});

test("FastAPI 주문: 서버가 알려 준 409·422 문구는 그대로 보여 준다", async () => {
  for (const [status, message] of [
    [
      409,
      "상품 가격이나 장바구니가 변경됐어요. 장바구니에서 다시 확인해 주세요.",
    ],
    [409, "장바구니가 비어 있습니다."],
    [409, "판매가 끝난 상품은 담을 수 없습니다."],
    [422, "상세주소는 1~100자로 입력해 주세요."],
  ]) {
    const { mockCheckout } = load({
      mode: fastapi,
      place: () => {
        throw new FastApiError(status, message);
      },
    });
    assert.deepEqual(await mockCheckout(input()), {
      ok: false,
      error: message,
    });
  }
});

test("FastAPI 주문: 로그인이 풀리면 다시 로그인하라고 안내하고, 서버 오류 문구는 숨긴다", async () => {
  const expired = load({
    mode: fastapi,
    place: () => {
      throw new FastApiError(401, "로그아웃된 토큰입니다.");
    },
  });
  const result = await expired.mockCheckout(input());
  assert.equal(result.ok, false);
  assert.match(result.error, /로그인/);
  for (const error of [
    new FastApiError(500, "DB 내부 오류 상세"),
    new Error("fetch failed"),
  ]) {
    const { mockCheckout } = load({
      mode: fastapi,
      place: () => {
        throw error;
      },
    });
    const failed = await mockCheckout(input());
    assert.equal(failed.ok, false);
    assert.doesNotMatch(failed.error, /DB 내부|fetch failed/);
  }
});

test("FastAPI 주문: 계정이 바뀌었거나 입력이 잘못되면 주문 API 를 부르지 않는다", async () => {
  const { mockCheckout, calls } = load({ mode: fastapi });
  const other = "00000000-0000-4000-8000-0000000000aa";
  assert.equal((await mockCheckout(input({ userId: other }))).ok, false);
  for (const bad of [
    input({ paymentMethod: "cash" }),
    input({ items: [] }),
    input({ requestKey: "not-a-uuid" }),
    input({ shipping: { ...input().shipping, address_detail: "" } }),
    { ...input(), total_amount: 1 },
    { ...input(), user_id: "x" },
  ])
    assert.equal((await mockCheckout(bad)).ok, false);
  assert.deepEqual(calls, []);
});

test("비회원은 주문·결제를 할 수 없다", async () => {
  const { mockCheckout, calls } = load({ mode: { kind: "guest" } });
  const result = await mockCheckout(input());
  assert.equal(result.ok, false);
  assert.match(result.error, /로그인/);
  assert.deepEqual(calls, []);
});

test("품절·판매 중지 상품이 들어 있으면 FastAPI 주문 API 를 부르지 않는다", async () => {
  const { mockCheckout, calls } = load({ mode: fastapi, unavailable: true });
  const result = await mockCheckout(input());
  assert.equal(result.ok, false);
  assert.match(result.error, /품절/);
  assert.deepEqual(calls, []);
});
