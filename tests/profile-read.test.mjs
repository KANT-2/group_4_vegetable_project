import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { Suspense } from "react";

test("서비스 JWT 없이 Supabase 프로필을 조회하거나 자동 생성하지 않는다", async () => {
  let supabaseCalls = 0;
  const modules = {
    "server-only": {},
    "next/headers": {
      cookies: async () => ({ get: () => undefined }),
    },
    "@/lib/auth-cookie": { ACCESS_TOKEN_COOKIE: "test-token" },
    "@/lib/fastapi": {
      fastApi: async () => {
        throw new Error("FastAPI should not be called without a token");
      },
    },
    "@/lib/auth": { requireUser: async () => ({ id: "user-one" }) },
    "@/lib/supabase/server": {
      createClient: async () => {
        supabaseCalls += 1;
        throw new Error("Supabase must not be used for service profiles");
      },
    },
  };
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/services/profile.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  await assert.rejects(exports.getProfile(), /로그인이 필요/);
  assert.equal(supabaseCalls, 0);
});

test("결제 화면은 장바구니·배송지 조회를 동시에 시작하고 계정 불일치를 차단한다", async () => {
  const started = [];
  let resolveCart, resolveProfile;
  const modules = {
    react: { Suspense },
    "react/jsx-runtime": jsxRuntime,
    "@/services/cart": {
      getCart: () => {
        started.push("cart");
        return new Promise((resolve) => {
          resolveCart = resolve;
        });
      },
    },
    "@/services/profile": {
      getProfile: () => {
        started.push("profile");
        return new Promise((resolve) => {
          resolveProfile = resolve;
        });
      },
    },
    "@/components/account/AccountGuard": { AccountGuard: () => null },
    "@/components/shopping/CheckoutForm": { CheckoutForm: () => null },
    "@/components/shopping/GuestCartMerge": { GuestCartMerge: () => null },
  };
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/app/cart/checkout/page.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  );
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  const content = exports.default().props.children[1].props.children.type;
  let result = content();
  assert.deepEqual(started, ["cart", "profile"]);
  resolveCart({ userId: "user-one", lines: [] });
  resolveProfile({ id: "user-one" });
  assert.equal((await result).props.userId, "user-one");
  result = content();
  resolveCart({ userId: "user-one", lines: [] });
  resolveProfile({ id: "user-two" });
  await assert.rejects(result, /계정이 변경/);
});
