import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { signInSchema } from "../src/schemas/auth.ts";
import { safeNextPath } from "../src/lib/redirect.ts";

function loadActions(overrides = {}) {
  const calls = [];
  const cookie = { value: undefined };
  const FastApiError = class FastApiError extends Error {
    constructor(status, message) {
      super(message);
      this.status = status;
    }
  };
  const modules = {
    "next/cache": {
      revalidatePath: (...args) => calls.push(["revalidate", ...args]),
    },
    "next/navigation": {
      redirect: (...args) => {
        calls.push(["redirect", ...args]);
        throw new Error("NEXT_REDIRECT");
      },
    },
    "next/headers": {
      cookies: async () => ({
        get: () => (cookie.value ? { value: cookie.value } : undefined),
        set: (name, value, options) => {
          cookie.value = value;
          calls.push(["cookie.set", name, value, options]);
        },
        delete: (name) => {
          cookie.value = undefined;
          calls.push(["cookie.delete", name]);
        },
      }),
    },
    "@/lib/supabase/server": {
      createClient: async () => ({
        auth: { signOut: async () => calls.push(["supabase.signOut"]) },
      }),
    },
    "@/schemas/auth": { signInSchema },
    "@/lib/redirect": { safeNextPath },
    "@/lib/auth-urls": { googleCallbackUrl: () => "" },
    "@/lib/supabase/config": { requireSupabaseConfig: () => ({ url: "" }) },
    "@/services/auth-settings": {
      getGoogleLoginStatus: async () => ({ ready: false, message: "disabled" }),
    },
    "@/lib/auth-cookie": {
      ACCESS_TOKEN_COOKIE: "access-token",
      accessTokenCookieOptions: (maxAge) => ({ httpOnly: true, maxAge }),
    },
    "@/lib/fastapi": {
      FastApiError,
      loginWithPassword: async () => ({
        access_token: "jwt-token",
        expires_in: 900,
      }),
      fastApi: async (...args) => calls.push(["fastApi", ...args]),
    },
    ...overrides,
  };
  const source = readFileSync(
    new URL("../src/actions/auth.ts", import.meta.url),
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
  return { actions: exports, calls, cookie, FastApiError };
}

test("로그인 성공 시 JWT를 HttpOnly 쿠키에 저장하고 안전한 경로로 이동한다", async () => {
  const { actions, calls } = loadActions();

  await assert.rejects(
    actions.signIn({
      email: "jina@test.com",
      password: "test1234!",
      next: "/account",
    }),
    /NEXT_REDIRECT/,
  );

  assert.deepEqual(calls[0], [
    "cookie.set",
    "access-token",
    "jwt-token",
    { httpOnly: true, maxAge: 900 },
  ]);
  assert.deepEqual(calls.at(-1), ["redirect", "/account"]);
});

test("로그인 입력 오류와 인증 실패를 사용자 메시지로 반환한다", async () => {
  const first = loadActions();
  assert.equal(
    (await first.actions.signIn({ email: "bad", password: "" })).ok,
    false,
  );
  assert.equal(first.calls.length, 0);

  const FastApiError = class FastApiError extends Error {
    constructor(status) {
      super("unauthorized");
      this.status = status;
    }
  };
  const second = loadActions({
    "@/lib/fastapi": {
      FastApiError,
      loginWithPassword: async () => {
        throw new FastApiError(401);
      },
      fastApi: async () => undefined,
    },
  });
  const result = await second.actions.signIn({
    email: "jina@test.com",
    password: "wrong-password",
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /이메일과 비밀번호/);
});

test("로그아웃은 블랙리스트 요청 뒤 브라우저 쿠키를 제거한다", async () => {
  const { actions, calls, cookie } = loadActions();
  cookie.value = "jwt-token";

  assert.deepEqual(await actions.signOut(false), { ok: true });
  assert.deepEqual(calls[0], [
    "fastApi",
    "/api/v1/accounts/logout",
    { method: "POST" },
    "jwt-token",
  ]);
  assert.ok(calls.some(([name]) => name === "cookie.delete"));
  assert.ok(calls.some(([name]) => name === "supabase.signOut"));
});

test("서버 로그아웃 실패 시에도 로컬 쿠키는 반드시 제거한다", async () => {
  const { actions, calls, cookie } = loadActions({
    "@/lib/fastapi": {
      FastApiError: class FastApiError extends Error {},
      loginWithPassword: async () => undefined,
      fastApi: async () => {
        throw new Error("network down");
      },
    },
  });
  cookie.value = "jwt-token";

  const result = await actions.signOut(false);

  assert.equal(result.ok, false);
  assert.equal(cookie.value, undefined);
  assert.ok(calls.some(([name]) => name === "cookie.delete"));
  assert.match(result.error, /로그인은 해제/);
});
