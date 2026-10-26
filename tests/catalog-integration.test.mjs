import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

function load(path, modules) {
  const exports = {};
  const { outputText } = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  new Function("require", "exports", outputText)((name) => {
    if (name === "server-only") return {};
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return exports;
}
class ApiError extends Error {
  constructor(status, message = "API error") {
    super(message);
    this.status = status;
  }
}
function products(api, extra = {}) {
  return load("../src/services/products.ts", {
    "@/data/mock/products": { products: [] },
    "@/lib/product-ranking": {},
    "@/lib/product-gallery": {},
    "./vegetables": {},
    "./managed-content": {},
    "@/lib/catalog-mode": { isFastApiCatalog: () => true },
    "@/lib/catalog-api": {
      catalogProduct: (row) => ({ id: row.id, price: row.price }),
    },
    "@/lib/fastapi": { fastApi: api, FastApiError: ApiError },
    ...extra,
  });
}

test("catalog sends search, filters, sorting and page to FastAPI rather than filtering a Supabase dump", async () => {
  let seen;
  const service = products(async (path) => {
    seen = new URL(path, "http://api");
    return {
      items: [{ id: "carrot", price: 1800 }],
      total: 41,
      page: 2,
      size: 20,
      reason_counts: { bent: 41 },
    };
  });
  const result = await service.getCatalogPage(
    {
      q: "당근",
      category: "root",
      reason: "bent",
      collection: "bulk",
      sort: "price_asc",
    },
    2,
    20,
  );
  assert.equal(seen.pathname, "/api/v1/catalog/products");
  assert.deepEqual(Object.fromEntries(seen.searchParams), {
    page: "2",
    size: "20",
    q: "당근",
    category: "root",
    reason: "bent",
    collection: "bulk",
    sort: "price_asc",
  });
  assert.equal(result.total, 41);
  assert.equal(result.items[0].price, 1800);
});

test("catalog full read follows server pagination without losing products after the first 100", async () => {
  const seen = [];
  const service = products(async (path) => {
    const page = Number(new URL(path, "http://api").searchParams.get("page"));
    seen.push(page);
    return {
      items:
        page === 1
          ? Array.from({ length: 100 }, (_, id) => ({
              id: String(id),
              price: 1,
            }))
          : [{ id: "last", price: 1 }],
      total: 101,
      size: 100,
      page,
    };
  });
  assert.equal((await service.getPublicProducts()).length, 101);
  assert.deepEqual(seen, [1, 2]);
});

test("catalog 404 becomes a missing detail, while an API failure stays an error without mock fallback", async () => {
  assert.equal(
    await products(async () => {
      throw new ApiError(404);
    }).getProductById("missing"),
    null,
  );
  await assert.rejects(
    () =>
      products(async () => {
        throw new ApiError(503);
      }).getProductById("carrot"),
    (error) => error.status === 503,
  );
});

function action(
  path,
  { token = "jwt", api = async () => {}, refresh = () => {} } = {},
) {
  return load(path, {
    "next/cache": { revalidatePath: refresh },
    zod: requireZod,
    "@/lib/catalog-api": { catalogToken: async () => token },
    "@/lib/fastapi": { fastApi: api, FastApiError: ApiError },
    "@/schemas/cart": cartSchemas,
  });
}
import * as requireZod from "zod";
import * as cartSchemas from "../src/schemas/cart.ts";

test("admin save sends only validated price and sale state using the HttpOnly token", async () => {
  const calls = [],
    refreshed = [];
  const { updateCatalogProduct } = action("../src/actions/catalog-admin.ts", {
    api: async (...args) => calls.push(args),
    refresh: (...args) => refreshed.push(args),
  });
  assert.equal(
    (
      await updateCatalogProduct({
        id: "carrot",
        price: 1500,
        is_active: false,
      })
    ).ok,
    true,
  );
  assert.equal(calls[0][0], "/api/v1/catalog/admin/products/carrot");
  assert.equal(calls[0][2], "jwt");
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    price: 1500,
    is_active: false,
  });
  assert.deepEqual(refreshed, [["/", "layout"]]);
});

test("admin save rejects invalid fields, missing token and server 403 without announcing success", async () => {
  const calls = [];
  const { updateCatalogProduct } = action("../src/actions/catalog-admin.ts", {
    api: async (...args) => calls.push(args),
  });
  for (const input of [
    { id: "carrot", price: 0, is_active: true },
    { id: "carrot", price: 10, is_active: true, role: "admin" },
  ])
    assert.equal((await updateCatalogProduct(input)).ok, false);
  const input = { id: "carrot", price: 1000, is_active: true };
  assert.equal(
    (
      await action("../src/actions/catalog-admin.ts", {
        token: null,
      }).updateCatalogProduct(input)
    ).ok,
    false,
  );
  assert.equal(calls.length, 0);
  let refreshes = 0;
  const denied = action("../src/actions/catalog-admin.ts", {
    api: async () => {
      throw new ApiError(403, "관리자 전용");
    },
    refresh: () => refreshes++,
  });
  assert.deepEqual(await denied.updateCatalogProduct(input), {
    ok: false,
    error: "관리자 전용",
  });
  assert.equal(refreshes, 0);
});

test("wish mutation uses product ID and token; client cannot select the owner", async () => {
  const calls = [];
  const { changeCatalogWish } = action("../src/actions/catalog-wishlist.ts", {
    api: async (...args) => calls.push(args),
  });
  assert.equal(
    (
      await changeCatalogWish({
        product_id: "carrot",
        wished: true,
        user_id: "someone-else",
      })
    ).ok,
    false,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (await changeCatalogWish({ product_id: "carrot", wished: true })).ok,
    true,
  );
  assert.deepEqual(calls[0], [
    "/api/v1/catalog/wishlist/carrot",
    { method: "PUT" },
    "jwt",
  ]);
  assert.equal(
    (await changeCatalogWish({ product_id: "carrot", wished: false })).ok,
    true,
  );
  assert.equal(calls[1][1].method, "DELETE");
});

test("expired wish session requests login; duplicate removal is safe", async () => {
  const input = { product_id: "carrot", wished: true };
  const expired = action("../src/actions/catalog-wishlist.ts", {
    api: async () => {
      throw new ApiError(401);
    },
  });
  assert.equal((await expired.changeCatalogWish(input)).needsLogin, true);
  const alreadyRemoved = action("../src/actions/catalog-wishlist.ts", {
    api: async () => {
      throw new ApiError(404);
    },
  });
  assert.equal(
    (await alreadyRemoved.changeCatalogWish({ ...input, wished: false })).ok,
    true,
  );
  assert.equal((await alreadyRemoved.changeCatalogWish(input)).ok, false);
});

test("navigation returns FastAPI wishlist IDs and avoids Supabase calls for JWT users", async () => {
  const route = load("../src/app/api/navigation/route.ts", {
    "@/lib/catalog-api": { wishlistIds: async () => ["carrot"] },
    "@/lib/cart-mode": {
      getCartMode: async () => ({ kind: "fastapi", token: "jwt" }),
    },
    "@/lib/cart-api": {
      apiGetCart: async () => ({ items: [{ quantity: 2 }] }),
    },
    "@/lib/guest-cart-core": {},
    "@/lib/guest-cart": {},
    "@/lib/fastapi": {
      fastApi: async (path) =>
        path.includes("accounts")
          ? {
              id: "owner",
              email: "owner@example.test",
              profile: { nickname: "회원" },
            }
          : { items: [{ quantity: 2 }] },
    },
    "@/lib/auth": {},
    "@/lib/supabase/server": {},
    "@/lib/customer-demo": { getCustomerDemo: async () => null },
    "@/lib/customer-demo-cart": {},
    "@/lib/customer-demo-wishlist": {},
  });
  const response = await route.GET();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data.wishlistIds, ["carrot"]);
  assert.equal(data.user.id, "owner");
  assert.equal(data.cartCount, 2);
});
