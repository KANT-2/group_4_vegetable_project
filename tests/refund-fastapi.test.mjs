import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { refundSchema } from "../src/schemas/refund.ts";

// FastAPI 로그인 사용자의 환불 신청: 서버 API 로 접수하고, 서버가 알려 준 문구·상태를 화면에 돌려준다.
class FastApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const input = {
  order_id: "00000000-0000-4000-8000-000000000011",
  reason: "맛이 없어서 환불하고 싶어요",
};

function load({ mode, api }) {
  const calls = [];
  const revalidated = [];
  const modules = {
    "next/cache": { revalidatePath: (path) => revalidated.push(path) },
    "@/lib/auth": {
      requireUser: async () => {
        throw new Error(
          "FastAPI 경로에서는 Supabase 로그인 확인을 쓰지 않아요",
        );
      },
    },
    "@/lib/supabase/server": {
      createClient: async () => {
        throw new Error("FastAPI 경로에서는 Supabase 를 부르지 않아요");
      },
    },
    "@/lib/cart-mode": { getCartMode: async () => mode },
    "@/lib/cart-api": {
      apiRequestRefund: async (...args) => {
        calls.push(args);
        return api(...args);
      },
    },
    "@/lib/fastapi": { FastApiError },
    "@/schemas/refund": { refundSchema },
  };
  const { outputText } = ts.transpileModule(
    readFileSync(new URL("../src/actions/refund.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  const exports = {};
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  return { requestRefund: exports.requestRefund, calls, revalidated };
}

const fastapi = { kind: "fastapi", token: "token-1", userId: "user-1" };

test("FastAPI 주문 환불: 토큰·주문 번호·사유를 서버에 보내고 주문 화면을 새로 그린다", async () => {
  const { requestRefund, calls, revalidated } = load({
    mode: fastapi,
    api: async () => ({ status: "requested" }),
  });
  assert.deepEqual(await requestRefund(input), { ok: true });
  assert.deepEqual(calls, [["token-1", input.order_id, input.reason]]);
  assert.ok(revalidated.includes("/mypage/orders"));
  assert.ok(revalidated.includes(`/mypage/orders/${input.order_id}`));
  assert.ok(revalidated.includes(`/mypage/orders/${input.order_id}/refund`));
});

test("FastAPI 주문 환불: 사유가 너무 짧으면 서버를 부르지 않는다", async () => {
  const { requestRefund, calls } = load({
    mode: fastapi,
    api: async () => ({}),
  });
  const result = await requestRefund({ ...input, reason: "짧아요" });
  assert.equal(result.ok, false);
  assert.deepEqual(calls, []);
});

test("FastAPI 주문 환불: 서버 거절은 알맞은 안내로 바꿔 보여 준다", async () => {
  const cases = [
    [401, "로그인이 필요해요. 다시 로그인해 주세요."],
    [404, "본인의 결제 완료 주문만 환불을 신청할 수 있어요."],
    [409, "결제 완료 주문만 환불을 신청할 수 있어요."],
    [422, "환불 사유는 10~500자로 입력해 주세요."],
  ];
  for (const [status, message] of cases) {
    const { requestRefund, revalidated } = load({
      mode: fastapi,
      api: async () => {
        throw new FastApiError(status, message);
      },
    });
    const result = await requestRefund(input);
    assert.equal(result.ok, false, `status ${status}`);
    assert.equal(result.error, message, `status ${status}`);
    assert.deepEqual(revalidated, [], "실패하면 화면을 새로 그리지 않아요");
  }
});

test("FastAPI 주문 환불: 서버 장애 문구는 숨기고 다시 시도하라고 안내한다", async () => {
  const { requestRefund } = load({
    mode: fastapi,
    api: async () => {
      throw new FastApiError(500, "내부 오류 상세 SQL 문구");
    },
  });
  const result = await requestRefund(input);
  assert.equal(result.ok, false);
  assert.equal(
    result.error,
    "환불 신청을 접수하지 못했어요. 다시 시도해 주세요.",
  );
  assert.ok(!result.error.includes("SQL"));
});
