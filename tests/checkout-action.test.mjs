import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { z } from "zod";
import { checkoutShippingSchema } from "../src/schemas/shipping.ts";

test("모의 결제 Action은 계정 전환·추가 필드·잘못된 입력을 차단하고 RPC 실패를 안내한다", async () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  let user = null;
  let error = null;
  const calls = [];
  const paths = [];
  let unavailable = false;
  const modules = {
    "@/lib/managed-content": { productUnavailable: () => unavailable },
    zod: { z },
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "@/lib/auth": { getCurrentUser: async () => user },
    "@/schemas/shipping": { checkoutShippingSchema },
    "@/lib/supabase/server": {
      createClient: async () => ({
        rpc: async (name, args) => {
          calls.push({ name, args });
          return { data: error ? null : "order-id", error };
        },
      }),
    },
  };
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/actions/checkout.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  const input = {
    paymentMethod: "bank_transfer",
    userId,
    requestKey: "00000000-0000-4000-8000-000000000099",
    shipping: {
      recipient_name: "테스트회원",
      recipient_phone: "010-1234-5678",
      postal_code: "01234",
      address: "테스트 가상 주소",
      address_detail: "테스트 상세주소",
    },
    items: [
      { product_id: "b", quantity: 1, unit_price: 1000 },
      { product_id: "a", quantity: 2, unit_price: 2000 },
    ],
    success: true,
  };
  assert.equal((await exports.mockCheckout(input)).ok, false);
  user = { id: "00000000-0000-4000-8000-000000000002" };
  assert.equal((await exports.mockCheckout(input)).ok, false);
  user = { id: userId };
  assert.match(
    (
      await exports.mockCheckout({
        ...input,
        shipping: { ...input.shipping, address_detail: "  " },
      })
    ).error,
    /상세주소/,
  );
  assert.equal(
    (await exports.mockCheckout({ ...input, paymentMethod: "cash" })).ok,
    false,
  );
  assert.equal(
    (await exports.mockCheckout({ ...input, total_amount: 1 })).ok,
    false,
  );
  assert.equal(
    (
      await exports.mockCheckout({
        ...input,
        items: [{ ...input.items[0], quantity: 100 }],
      })
    ).ok,
    false,
  );
  assert.equal(calls.length, 0);
  assert.deepEqual(await exports.mockCheckout(input), {
    ok: true,
    orderId: "order-id",
  });
  assert.equal(calls[0].name, "mock_checkout");
  assert.deepEqual(
    calls[0].args.p_expected_items.map((item) => item.product_id),
    ["a", "b"],
  );
  assert.equal(calls[0].args.p_shipping.recipient_phone, "01012345678");
  assert.equal(calls[0].args.p_shipping.payment_method, "bank_transfer");
  assert.deepEqual(paths, ["/cart", "/mypage/orders"]);
  error = { message: "CART_CHANGED" };
  assert.match((await exports.mockCheckout(input)).error, /변경/);
  unavailable = true;
  const previousCalls = calls.length;
  assert.match((await exports.mockCheckout(input)).error, /품절/);
  assert.equal(calls.length, previousCalls);
});
