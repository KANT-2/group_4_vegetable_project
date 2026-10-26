import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as guestCore from "../src/lib/guest-cart-core.ts";

// src/app/api/navigation/route.ts 를 가짜 의존성으로 실행해요. (비회원·FastAPI 로그인 경로)
function loadRoute({ mode, guestItems = [], cart, me }) {
  const modules = {
    "@/lib/customer-demo": { getCustomerDemo: async () => null },
    "@/lib/auth": { getCurrentUser: async () => null },
    "@/lib/supabase/server": {
      createClient: async () => {
        throw new Error("Supabase 를 부르면 안 돼요");
      },
    },
    "@/lib/cart-mode": { getCartMode: async () => mode },
    "@/lib/guest-cart-core": guestCore,
    "@/lib/guest-cart": { readGuestCart: async () => guestItems },
    "@/lib/cart-api": { apiGetCart: async () => cart },
    "@/lib/fastapi": { fastApi: async () => me },
  };
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/app/api/navigation/route.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  const exports = {};
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  return exports;
}

test("비회원: 로그인 정보 없이 쿠키 장바구니의 수량 합계만 알려 준다", async () => {
  const { GET } = loadRoute({
    mode: { kind: "guest" },
    guestItems: [
      { productId: "carrot-1kg", quantity: 2 },
      { productId: "apple-2kg", quantity: 5 },
    ],
  });
  const response = await GET();
  assert.deepEqual(await response.json(), { user: null, cartCount: 7 });
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Cookie");
});

test("비회원: 빈 장바구니는 0", async () => {
  const { GET } = loadRoute({ mode: { kind: "guest" } });
  assert.deepEqual(await (await GET()).json(), { user: null, cartCount: 0 });
});

test("FastAPI 로그인: 계정 정보와 FastAPI 장바구니 수량을 알려 준다(Supabase 는 부르지 않는다)", async () => {
  const { GET } = loadRoute({
    mode: { kind: "fastapi", token: "T", userId: "u-1" },
    me: { id: "u-1", email: "a@example.test", profile: { nickname: "영우" } },
    cart: { items: [{ quantity: 2 }, { quantity: 3 }], subtotal_amount: 0 },
  });
  const body = await (await GET()).json();
  assert.deepEqual(body, {
    user: { id: "u-1", nickname: "영우", email: "a@example.test" },
    cartCount: 5,
    wishlistIds: [],
  });
});

test("FastAPI 로그인: 조회에 실패하면 503", async () => {
  const mod = loadRoute({
    mode: { kind: "fastapi", token: "T", userId: "u-1" },
  });
  // me·cart 가 정의되지 않아 TypeError 가 나는 상황 = 조회 실패
  assert.equal((await mod.GET()).status, 503);
});
