import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("장바구니 뱃지는 본인 상품의 총 수량을 세고 비로그인·실패 응답을 구분한다", async () => {
  let user = { id: "current-user" };
  let quantities = [{ quantity: 2 }, { quantity: 3 }];
  let cartError = null;
  let queries = 0;
  const modules = {
    "@/lib/customer-demo": { getCustomerDemo: async () => null },
    "@/lib/auth": { getCurrentUser: async () => user },
    "@/lib/supabase/server": {
      createClient: async () => ({
        from: (table) => ({
          select: (fields) => {
            queries++;
            assert.equal(
              fields,
              table === "cart_items" ? "quantity" : table === "wishlist_items" ? "product_id" : "nickname",
            );
            return {
              eq: (column, value) => {
                assert.equal(column, table === "profiles" ? "id" : "user_id");
                assert.equal(value, "current-user");
                return table === "wishlist_items"
                  ? Promise.resolve({ data: [], error: null })
                  : table === "cart_items"
                  ? Promise.resolve({ data: quantities, error: cartError })
                  : {
                      maybeSingle: async () => ({
                        data: { nickname: "회원" },
                        error: null,
                      }),
                    };
              },
            };
          },
        }),
      }),
    },
  };
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(
      new URL("../src/app/api/navigation/route.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  let response = await exports.GET();
  assert.equal((await response.json()).cartCount, 5);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(response.headers.get("Vary"), "Cookie");
  quantities = [{ quantity: 3 }, { quantity: 3 }];
  assert.equal((await (await exports.GET()).json()).cartCount, 6);
  quantities = [];
  assert.equal((await (await exports.GET()).json()).cartCount, 0);
  cartError = { message: "unavailable" };
  assert.equal((await exports.GET()).status, 503);
  user = null;
  const before = queries;
  response = await exports.GET();
  assert.deepEqual(await response.json(), { user: null, cartCount: 0 });
  assert.equal(queries, before);
});
