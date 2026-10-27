import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { readBoundedText, RequestBodyError } from "../src/lib/request-body.ts";

function api(fetch) {
  const { outputText } = ts.transpileModule(
    readFileSync(new URL("../src/lib/fastapi.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  const exports = {};
  new Function("require", "exports", "fetch", outputText)(
    (name) =>
      name === "next/navigation"
        ? {
            unstable_rethrow: (error) => {
              if (error?.frameworkInterrupt) throw error;
            },
          }
        : {},
    exports,
    fetch,
  );
  return exports;
}

test("API 연결 실패·잘못된 성공 응답은 일관된 오류이며 서버 내부 문구는 노출하지 않는다", async () => {
  const interrupt = { frameworkInterrupt: true };
  await assert.rejects(
    api(async () => {
      throw interrupt;
    }).fastApi("/test"),
    (e) => e === interrupt,
  );
  let client = api(async () => {
    throw new TypeError("private connection details");
  });
  await assert.rejects(
    client.fastApi("/test"),
    (e) => e.status === 503 && !e.message.includes("private"),
  );
  client = api(async () => new Response("<html>gateway</html>"));
  await assert.rejects(client.fastApi("/test"), (e) => e.status === 502);
  client = api(async () =>
    Response.json({ detail: "private SQL" }, { status: 500 }),
  );
  await assert.rejects(
    client.fastApi("/test"),
    (e) => e.status === 500 && !e.message.includes("SQL"),
  );
  client = api(async () =>
    Response.json({ detail: "재고 부족", available: 2 }, { status: 409 }),
  );
  await assert.rejects(
    client.fastApi("/test"),
    (e) => e.status === 409 && e.available === 2 && e.message === "재고 부족",
  );
});

test("API는 제한 시간·호출자 취소 신호와 multipart 경계값을 보존한다", async () => {
  const controller = new AbortController();
  const client = api(async (_, init) => {
    assert.ok(init.signal);
    assert.equal(init.headers.has("Content-Type"), false);
    controller.abort();
    assert.equal(init.signal.aborted, true);
    return new Response(null, { status: 204 });
  });
  assert.equal(
    await client.fastApi("/test", {
      signal: controller.signal,
      body: new FormData(),
    }),
    undefined,
  );
});

test("요청 본문은 헤더 유무와 무관하게 실제 UTF-8 바이트로 제한한다", async () => {
  const request = (body) =>
    new Request("http://test", { method: "POST", body });
  assert.equal(await readBoundedText(request("한글"), 6), "한글");
  await assert.rejects(
    readBoundedText(request("한글"), 5),
    (e) => e instanceof RequestBodyError && e.status === 413,
  );
  const oversized = new Request("http://test", {
    method: "POST",
    headers: { "Content-Length": "1000" },
    body: "a",
  });
  await assert.rejects(readBoundedText(oversized, 10), (e) => e.status === 413);
  const broken = new Request("http://test", {
    method: "POST",
    duplex: "half",
    body: new ReadableStream({
      start(c) {
        c.error(new Error("disconnected"));
      },
    }),
  });
  await assert.rejects(readBoundedText(broken, 10), (e) => e.status === 400);
});
