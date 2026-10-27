// src/actions/cart.ts 를 가짜 의존성으로 실행하는 테스트 도우미. (이 파일은 테스트가 아니라 *.test.mjs 에서 가져다 써요.)
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as cartSchemas from "../src/schemas/cart.ts";
import * as guestCore from "../src/lib/guest-cart-core.ts";

export class FastApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 비회원 장바구니 쿠키를 메모리로 흉내 내요.
export function fakeGuestStore(initial = []) {
  const store = { items: [...initial], saves: 0, clears: 0 };
  return {
    store,
    module: {
      readGuestCart: async () => [...store.items],
      saveGuestCart: async (items) => {
        store.items = [...items];
        store.saves += 1;
      },
      clearGuestCart: async () => {
        store.items = [];
        store.clears += 1;
      },
    },
  };
}

// mode: getCartMode() 가 돌려줄 값. 생략하면 user 로 정해요(user 가 없으면 비회원).
export function loadActions({
  user = { id: "me" },
  db,
  mode,
  guest = fakeGuestStore(),
  api = {},
  active = ["carrot-1kg"],
  calls = [],
  unavailable = false,
} = {}) {
  const resolvedMode =
    mode ?? (user ? { kind: "supabase", userId: user.id } : { kind: "guest" });
  const modules = {
    "@/lib/catalog-mode": { isFastApiCatalog: () => false },
    "@/lib/catalog-api": { catalogToken: async () => null },
    "@/lib/managed-content": { productUnavailable: () => unavailable },
    "@/lib/customer-demo": { getCustomerDemo: async () => null },
    "next/cache": {
      revalidatePath: (path) => calls.push(["revalidate", path]),
    },
    "@/lib/auth": { getCurrentUser: async () => user },
    "@/schemas/cart": cartSchemas,
    "@/lib/supabase/server": { createClient: async () => db },
    "@/lib/cart-mode": { getCartMode: async () => resolvedMode },
    "@/lib/guest-cart-core": guestCore,
    "@/lib/guest-cart": guest.module,
    "@/lib/fastapi": { FastApiError },
    "@/lib/cart-api": api,
    "@/services/products": {
      getProductById: async (id) => (active.includes(id) ? { id } : null),
    },
  };
  const { outputText } = ts.transpileModule(
    readFileSync(new URL("../src/actions/cart.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  );
  const exports = {};
  new Function("require", "exports", outputText)(
    (name) => modules[name],
    exports,
  );
  return exports;
}
