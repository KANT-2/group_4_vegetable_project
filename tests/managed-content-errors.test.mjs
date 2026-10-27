import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import * as requestBody from "../src/lib/request-body.ts";

function route(readContent) {
  let writes = 0;
  const modules = {
    "next/server": { NextResponse: Response },
    "next/cache": { revalidatePath() {} },
    "@/lib/admin-auth": { getAdminAccess: async () => ({ allowed: true }) },
    "@/lib/managed-content": {
      readContent,
      hiddenContent: () => false,
      mutateContent: () => {
        writes++;
      },
    },
    zod: { z },
    "@/lib/request-body": requestBody,
    "@/lib/catalog-mode": { isFastApiCatalog: () => false },
    "@/lib/catalog-api": {},
    "@/lib/admin-catalog-sync": { CatalogSyncError: class extends Error {} },
  };
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/app/api/managed-content/route.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  const exports = {};
  new Function("require", "exports", outputText)((name) => {
    assert.ok(name in modules, name);
    return modules[name];
  }, exports);
  return { ...exports, writes: () => writes };
}

const request = (body, extra = {}) =>
  new Request("http://test/admin/api/content", {
    method: "POST",
    headers: { Origin: "http://test", ...extra },
    body,
  });
test("관리자 API는 잘못된 JSON·용량·수정 충돌을 저장 없이 구분한다", async () => {
  const api = route(() => ({ revision: 1, state: {} }));
  assert.equal((await api.POST(request("{invalid"))).status, 400);
  assert.equal(
    (
      await api.POST(
        request("{}", { "Content-Length": String(26 * 1024 * 1024) }),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await api.POST(
        request(
          JSON.stringify({
            revision: 0,
            action: { type: "products", update: [] },
          }),
        ),
      )
    ).status,
    409,
  );
  assert.equal(api.writes(), 0);
});
test("저장 파일 손상은 요청 오류로 오인하지 않고 읽기·저장을 중단한다", async () => {
  const api = route(() => {
    throw new SyntaxError("PRIVATE DATA");
  });
  const read = await api.GET(new Request("http://test/api/managed-content"));
  assert.equal(read.status, 503);
  const write = await api.POST(
    request(
      JSON.stringify({ revision: 0, action: { type: "products", update: [] } }),
    ),
  );
  assert.equal(write.status, 500);
  assert.equal(api.writes(), 0);
  assert.equal((await read.text()).includes("PRIVATE"), false);
});
