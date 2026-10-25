import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { profileSchema } from "../src/schemas/profile.ts";
import { shippingSchema } from "../src/schemas/shipping.ts";

test("프로필 저장은 현재 계정만 쓰며 계정 전환·잘못된 입력·DB 실패를 차단한다", async () => {
  const writes = [];
  let databaseError = null;
  let revalidated = false;
  const modules = {
    "next/cache": { revalidatePath: () => (revalidated = true) },
    "next/headers": {
      cookies: async () => ({ get: () => undefined }),
    },
    "@/lib/auth-cookie": { ACCESS_TOKEN_COOKIE: "test-token" },
    "@/lib/fastapi": {
      FastApiError: class FastApiError extends Error {},
      fastApi: async () => {
        throw new Error("FastAPI should not be called without a token");
      },
    },
    "@/lib/auth": { requireUser: async () => ({ id: "current-user" }) },
    "@/schemas/profile": { profileSchema },
    "@/schemas/shipping": { shippingSchema },
    "@/lib/supabase/server": {
      createClient: async () => ({
        from: () => ({
          upsert: async (row) => {
            writes.push(row);
            return { error: databaseError };
          },
          update: (row) => ({
            eq: (column, id) => {
              assert.equal(column, "id");
              writes.push({ id, ...row });
              return {
                select: () => ({
                  single: async () => ({
                    data: databaseError ? null : { id },
                    error: databaseError,
                  }),
                }),
              };
            },
          }),
        }),
      }),
    },
  };
  const source = readFileSync(
    new URL("../src/actions/profile.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  new Function("require", "exports", outputText)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  const save = exports.updateProfile;
  assert.equal((await save({ nickname: "새이름" }, "old-user")).ok, false);
  assert.equal(
    (await save({ nickname: "새이름", id: "other-user" }, "current-user")).ok,
    false,
  );
  assert.deepEqual(writes, []);
  assert.equal((await save({ nickname: " 새이름 " }, "current-user")).ok, true);
  assert.deepEqual(writes, [{ id: "current-user", nickname: "새이름" }]);
  assert.equal(revalidated, true);
  databaseError = new Error("unavailable");
  revalidated = false;
  assert.equal(
    (await save({ nickname: "다른이름" }, "current-user")).ok,
    false,
  );
  assert.equal(revalidated, false);
  databaseError = null;
  writes.length = 0;
  const shipping = {
    recipient_name: "가상회원",
    recipient_phone: "010-1234-5678",
    postal_code: "01234",
    address: "가상 테스트 주소",
    address_detail: "테스트 상세",
  };
  assert.equal(
    (await exports.saveShippingAddress(shipping, "old-user")).ok,
    false,
  );
  assert.equal(
    (
      await exports.saveShippingAddress(
        { ...shipping, id: "other-user" },
        "current-user",
      )
    ).ok,
    false,
  );
  assert.deepEqual(writes, []);
  assert.equal(
    (await exports.saveShippingAddress(shipping, "current-user")).ok,
    true,
  );
  assert.deepEqual(writes[0], {
    id: "current-user",
    ...shipping,
    recipient_phone: "01012345678",
  });
  assert.equal((await exports.clearShippingAddress("old-user")).ok, false);
  assert.equal(writes.length, 1);
  assert.equal((await exports.clearShippingAddress("current-user")).ok, true);
  assert.equal(writes[1].address, null);
});
