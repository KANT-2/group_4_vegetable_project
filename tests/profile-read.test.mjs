import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { Suspense } from "react";

test("프로필이 있으면 조회만 하고 없을 때만 준비하며 타인의 닉네임을 덮어쓰지 않는다", async () => {
  let currentId = "user-one";
  let existing = { id: currentId, nickname: "기존이름" };
  let readError = null;
  const writes = [];
  const modules = {
    "server-only": {},
    "@/lib/auth": { requireUser: async () => ({ id: currentId }) },
    "@/lib/supabase/server": {
      createClient: async () => ({
        from: () => ({
          select: () => ({
            eq: (field, id) => {
              assert.equal(field, "id");
              assert.equal(id, currentId);
              return {
                maybeSingle: async () => ({ data: existing, error: readError }),
                single: async () => ({
                  data: { id, nickname: "새싹회원" },
                  error: null,
                }),
              };
            },
          }),
          upsert: async (row, options) => {
            writes.push(row);
            assert.equal(options.ignoreDuplicates, true);
            return { error: null };
          },
        }),
      }),
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
  assert.deepEqual(await exports.getProfile(), existing);
  assert.equal(writes.length, 0);
  existing = null;
  assert.equal((await exports.getProfile()).id, currentId);
  assert.deepEqual(writes, [{ id: currentId, nickname: "새싹회원" }]);
  currentId = "user-two";
  existing = { id: currentId, nickname: "다른회원" };
  assert.equal((await exports.getProfile()).id, "user-two");
  assert.equal(writes.length, 1);
  readError = new Error("unavailable");
  await assert.rejects(exports.getProfile(), /불러오지/);
  assert.equal(writes.length, 1);
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
