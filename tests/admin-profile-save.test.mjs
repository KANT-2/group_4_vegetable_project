import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("FastAPI 관리자 이름은 API 제한을 지키고 이메일 변경을 성공으로 처리하지 않는다", async () => {
  const calls = [];
  const modules = {
    "next/cache": { revalidatePath() {} },
    "next/headers": { cookies: async () => ({ get: () => ({ value: "token" }) }) },
    "@/lib/auth-cookie": { ACCESS_TOKEN_COOKIE: "token" },
    "@/lib/admin-auth": { hasPasswordSession: async () => false },
    "@/lib/supabase/server": { createClient() { throw new Error("Unexpected Supabase call"); } },
    "@/lib/admin-registration-server": {},
    "@/lib/fastapi": { fastApi: async (path, init, token) => {
      calls.push({ path, init, token });
      return { email: "admin@example.test" };
    } },
  };
  const source = readFileSync(new URL("../src/actions/admin-profile.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const exports = {};
  new Function("require", "exports", outputText)((name) => {
    assert.ok(name in modules, name);
    return modules[name];
  }, exports);
  const save = (name, email = "admin@example.test") => {
    const form = new FormData();
    form.set("name", name); form.set("email", email);
    return exports.updateAdminName({}, form);
  };
  for (const name of ["가", "가".repeat(21)]) assert.ok((await save(name)).error);
  assert.equal(calls.length, 0);
  assert.ok((await save("관리자", "changed@example.test")).error);
  assert.equal(calls.filter(c => c.init.method === "PATCH").length, 0);
  assert.ok((await save("관리자")).success);
  const write = calls.find(c => c.init.method === "PATCH");
  assert.equal(write.token, "token");
  assert.deepEqual(JSON.parse(write.init.body), { nickname: "관리자" });
});
