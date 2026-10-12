import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { refundSchema } from "../src/schemas/refund.ts";

test("환불 Action은 주문 소유자·결제 상태를 확인하고 재시도 시 첫 신청을 유지한다", async () => {
  let order = null;
  let insertError = null;
  const inserts = [];
  const modules = {
    "next/cache": { revalidatePath: () => {} },
    "@/lib/auth": { requireUser: async () => ({ id: "current-user" }) },
    "@/schemas/refund": { refundSchema },
    "@/lib/supabase/server": {
      createClient: async () => ({
        from: (name) =>
          name === "orders"
            ? {
                select: () => ({
                  eq: (column, value) => {
                    assert.equal(column, "user_id");
                    assert.equal(value, "current-user");
                    return {
                      eq: () => ({
                        maybeSingle: async () => ({ data: order, error: null }),
                      }),
                    };
                  },
                }),
              }
            : {
                insert: async (data) => {
                  inserts.push(data);
                  return { error: insertError };
                },
              },
      }),
    },
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
  const input = {
    order_id: "00000000-0000-4000-8000-000000000011",
    reason: "테스트 주문의 환불을 신청합니다.",
  };
  assert.equal((await exports.requestRefund(input)).ok, false);
  order = { id: input.order_id, status: "pending" };
  assert.equal((await exports.requestRefund(input)).ok, false);
  assert.deepEqual(inserts, []);
  order.status = "paid";
  assert.equal((await exports.requestRefund(input)).ok, true);
  assert.deepEqual(inserts[0], input);
  insertError = { code: "23505" };
  assert.equal((await exports.requestRefund(input)).ok, true);
  insertError = { code: "42501" };
  assert.equal((await exports.requestRefund(input)).ok, false);
});

test("계정 폼은 브라우저 기본 검사 대신 Zod 안내 문구를 보여 준다", () => {
  for (const name of ["ProfileForm", "ShippingAddressForm", "RefundForm"]) {
    const source = readFileSync(
      new URL(`../src/components/account/${name}.tsx`, import.meta.url),
      "utf8",
    );
    assert.match(
      source,
      /<form[^>]*\bnoValidate\b/s,
      `${name}에 noValidate 필요`,
    );
    assert.match(source, /safeParse\(/, `${name}은 제출 시 Zod로 검사해야 함`);
  }
});
