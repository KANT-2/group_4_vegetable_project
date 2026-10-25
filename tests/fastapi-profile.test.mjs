import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { profileSchema } from "../src/schemas/profile.ts";
import { shippingSchema } from "../src/schemas/shipping.ts";

function load(sourcePath, modules) {
  const source = readFileSync(new URL(sourcePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  new Function("require", "exports", outputText)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}

test("FastAPI 프로필 수정은 JWT 사용자 ID만 사용한다", async () => {
  const calls = [];
  const modules = {
    "next/cache": { revalidatePath: () => undefined },
    "next/headers": {
      cookies: async () => ({ get: () => ({ value: "jwt-token" }) }),
    },
    "@/lib/auth-cookie": { ACCESS_TOKEN_COOKIE: "test-token" },
    "@/lib/auth": { requireUser: async () => ({ id: "current-user" }) },
    "@/lib/supabase/server": {
      createClient: async () => {
        throw new Error("Supabase should not be called with a FastAPI token");
      },
    },
    "@/schemas/profile": { profileSchema },
    "@/schemas/shipping": { shippingSchema },
    "@/lib/fastapi": {
      FastApiError: class FastApiError extends Error {},
      fastApi: async (path, init, token) => calls.push({ path, init, token }),
    },
  };
  const actions = load("../src/actions/profile.ts", modules);

  assert.equal(
    (await actions.updateProfile({ nickname: " 새이름 " }, "current-user")).ok,
    true,
  );
  assert.equal(
    (await actions.updateProfile({ nickname: "새이름" }, "other-user")).ok,
    false,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, "/api/v1/accounts/me/profile");
  assert.equal(calls[0].token, "jwt-token");
  assert.deepEqual(JSON.parse(calls[0].init.body), { nickname: "새이름" });
});

test("FastAPI 마이페이지 조회 응답을 기존 화면 형식으로 변환한다", async () => {
  const modules = {
    "server-only": {},
    "next/headers": {
      cookies: async () => ({ get: () => ({ value: "jwt-token" }) }),
    },
    "@/lib/auth-cookie": { ACCESS_TOKEN_COOKIE: "test-token" },
    "@/lib/auth": {
      requireUser: async () => ({ id: "current-user", email: "jina@test.com" }),
    },
    "@/lib/supabase/server": {
      createClient: async () => {
        throw new Error("Supabase should not be called with a FastAPI token");
      },
    },
    "@/lib/fastapi": {
      fastApi: async () => ({
        id: "current-user",
        email: "jina@test.com",
        role: "user",
        profile: {
          user_id: "current-user",
          nickname: "지나",
          shipping_address: {
            recipient_name: "김지나",
            recipient_phone: "01012345678",
            postal_code: "12345",
            address: "서울시 중구 세종대로 1",
            address_detail: "101호",
          },
        },
      }),
    },
  };
  const service = load("../src/services/profile.ts", modules);

  const profile = await service.getProfile();

  assert.equal(profile.id, "current-user");
  assert.equal(profile.nickname, "지나");
  assert.equal(profile.recipient_phone, "01012345678");
});
