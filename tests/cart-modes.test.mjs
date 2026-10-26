import assert from "node:assert/strict";
import test from "node:test";
import {
  FastApiError,
  fakeGuestStore,
  loadActions,
} from "./cart-actions-loader.mjs";

const carrot = "carrot-1kg";
const apple = "apple-2kg";
const active = [carrot, apple];

// ---------- 비회원(쿠키) ----------

test("비회원도 판매 중인 상품을 담고, 같은 상품은 수량을 더한다", async () => {
  const guest = fakeGuestStore();
  const { addToCart } = loadActions({ user: null, guest, active });
  assert.deepEqual(await addToCart({ product_id: carrot, quantity: 2 }), {
    ok: true,
    quantity: 2,
  });
  assert.deepEqual(await addToCart({ product_id: carrot, quantity: 3 }), {
    ok: true,
    quantity: 5,
  });
  await addToCart({ product_id: apple, quantity: 1 });
  assert.deepEqual(guest.store.items, [
    { productId: apple, quantity: 1 },
    { productId: carrot, quantity: 5 },
  ]);
});

test("비회원: 판매 중이 아닌 상품·잘못된 입력은 쿠키에 저장하지 않는다", async () => {
  const guest = fakeGuestStore();
  const { addToCart } = loadActions({ user: null, guest, active });
  for (const input of [
    { product_id: "gone-1kg", quantity: 1 },
    { product_id: carrot, quantity: 0 },
    { product_id: carrot, quantity: 100 },
    { product_id: "Bad ID", quantity: 1 },
    { product_id: carrot, quantity: 1, user_id: "other" },
  ])
    assert.equal((await addToCart(input)).ok, false, JSON.stringify(input));
  assert.equal(guest.store.saves, 0);
});

test("비회원: 합쳐서 99를 넘으면 자르지 않고 알려 준다", async () => {
  const guest = fakeGuestStore([{ productId: carrot, quantity: 98 }]);
  const { addToCart } = loadActions({ user: null, guest, active });
  const result = await addToCart({ product_id: carrot, quantity: 2 });
  assert.equal(result.ok, false);
  assert.match(result.error, /99/);
  assert.deepEqual(guest.store.items, [{ productId: carrot, quantity: 98 }]);
});

test("비회원: 수량 변경·삭제", async () => {
  const guest = fakeGuestStore([{ productId: carrot, quantity: 2 }]);
  const { updateCartQuantity, removeFromCart } = loadActions({
    user: null,
    guest,
    active,
  });
  assert.deepEqual(
    await updateCartQuantity({ product_id: carrot, quantity: 7 }),
    { ok: true, quantity: 7 },
  );
  assert.equal(
    (await updateCartQuantity({ product_id: apple, quantity: 1 })).ok,
    false,
  ); // 담지 않은 상품
  assert.deepEqual(await removeFromCart({ product_id: carrot }), { ok: true });
  assert.deepEqual(guest.store.items, []);
});

test("비회원 장바구니는 로그인 요구(needsLogin)를 돌려주지 않는다", async () => {
  const guest = fakeGuestStore();
  const actions = loadActions({ user: null, guest, active });
  for (const result of [
    await actions.addToCart({ product_id: carrot, quantity: 1 }),
    await actions.updateCartQuantity({ product_id: carrot, quantity: 2 }),
    await actions.removeFromCart({ product_id: carrot }),
  ])
    assert.equal(result.needsLogin, undefined);
});

// ---------- FastAPI 로그인 ----------

function apiRecorder(handlers = {}) {
  const calls = [];
  const api = {
    apiAddToCart: async (token, productId, quantity) => {
      calls.push(["add", token, productId, quantity]);
      return handlers.add ? handlers.add(productId, quantity) : { quantity };
    },
    apiChangeQuantity: async (token, productId, quantity) => {
      calls.push(["change", token, productId, quantity]);
      return handlers.change
        ? handlers.change(productId, quantity)
        : { quantity };
    },
    apiMergeCart: async (token, items) => {
      calls.push(["merge", token, items]);
      if (handlers.merge) return handlers.merge(items);
      return { merged: items.length, skipped_product_ids: [] };
    },
    apiRemoveFromCart: async (token, productId) => {
      calls.push(["remove", token, productId]);
      if (handlers.remove) return handlers.remove(productId);
    },
  };
  return { api, calls };
}

const fastapi = { kind: "fastapi", token: "TOKEN", userId: "user-1" };

test("FastAPI 로그인: 장바구니 담기·변경·삭제가 토큰과 함께 FastAPI 로 간다", async () => {
  const { api, calls } = apiRecorder();
  const guest = fakeGuestStore();
  const a = loadActions({ mode: fastapi, api, guest, active });
  assert.deepEqual(await a.addToCart({ product_id: carrot, quantity: 2 }), {
    ok: true,
    quantity: 2,
  });
  assert.deepEqual(
    await a.updateCartQuantity({ product_id: carrot, quantity: 4 }),
    { ok: true, quantity: 4 },
  );
  assert.deepEqual(await a.removeFromCart({ product_id: carrot }), {
    ok: true,
  });
  assert.deepEqual(calls, [
    ["add", "TOKEN", carrot, 2],
    ["change", "TOKEN", carrot, 4],
    ["remove", "TOKEN", carrot],
  ]);
  assert.equal(guest.store.saves, 0); // 로그인 사용자의 장바구니는 쿠키에 쓰지 않는다
});

test("FastAPI 오류: 사람이 읽는 메시지는 그대로, 인증 만료는 로그인으로, 그 밖은 일반 오류", async () => {
  const cases = [
    [
      new FastApiError(409, "판매가 끝난 상품은 담을 수 없습니다."),
      { ok: false, error: "판매가 끝난 상품은 담을 수 없습니다." },
    ],
    [
      new FastApiError(422, "수량은 1~99개여야 합니다."),
      { ok: false, error: "수량은 1~99개여야 합니다." },
    ],
    [
      new FastApiError(404, "상품을 찾을 수 없습니다."),
      { ok: false, error: "상품을 찾을 수 없습니다." },
    ],
    [
      new FastApiError(401, "로그아웃된 토큰입니다."),
      { ok: false, error: "로그인이 필요해요.", needsLogin: true },
    ],
  ];
  for (const [error, expected] of cases) {
    const { api } = apiRecorder({
      add: () => {
        throw error;
      },
    });
    const { addToCart } = loadActions({ mode: fastapi, api, active });
    assert.deepEqual(
      await addToCart({ product_id: carrot, quantity: 1 }),
      expected,
    );
  }
  for (const error of [
    new FastApiError(500, "서버 내부 정보"),
    new FastApiError(503, "x"),
    new Error("fetch failed"),
  ]) {
    const { api } = apiRecorder({
      add: () => {
        throw error;
      },
    });
    const result = await loadActions({ mode: fastapi, api, active }).addToCart({
      product_id: carrot,
      quantity: 1,
    });
    assert.equal(result.ok, false);
    assert.doesNotMatch(result.error, /서버 내부 정보|fetch failed/); // 내부 오류 문구는 화면에 내보내지 않는다
  }
});

test("FastAPI: 이미 지워진 상품을 또 지워도 성공으로 본다", async () => {
  const { api } = apiRecorder({
    remove: () => {
      throw new FastApiError(404, "장바구니에 없는 상품입니다.");
    },
  });
  const { removeFromCart } = loadActions({ mode: fastapi, api });
  assert.deepEqual(await removeFromCart({ product_id: carrot }), { ok: true });
  const failing = apiRecorder({
    remove: () => {
      throw new FastApiError(500, "x");
    },
  });
  assert.equal(
    (
      await loadActions({ mode: fastapi, api: failing.api }).removeFromCart({
        product_id: carrot,
      })
    ).ok,
    false,
  );
});

test("FastAPI: 요청 형식이 틀리면 FastAPI 를 부르지 않는다", async () => {
  const { api, calls } = apiRecorder();
  const { addToCart, updateCartQuantity } = loadActions({ mode: fastapi, api });
  assert.equal(
    (await addToCart({ product_id: carrot, quantity: 0 })).ok,
    false,
  );
  assert.equal(
    (await addToCart({ product_id: carrot, quantity: 1, user_id: "x" })).ok,
    false,
  );
  assert.equal(
    (await updateCartQuantity({ product_id: "Bad ID", quantity: 1 })).ok,
    false,
  );
  assert.deepEqual(calls, []);
});

// ---------- 로그인 후 비회원 장바구니 합치기 (멱등) ----------

test("합치기: 비회원 장바구니 전체를 한 번에 보내고 성공하면 쿠키를 지운다", async () => {
  const { api, calls } = apiRecorder();
  const guest = fakeGuestStore([
    { productId: carrot, quantity: 2 },
    { productId: apple, quantity: 1 },
  ]);
  const { mergeGuestCart } = loadActions({ mode: fastapi, api, guest });
  assert.deepEqual(await mergeGuestCart(), { ok: true, merged: 2, skipped: 0 });
  assert.deepEqual(calls, [
    [
      "merge",
      "TOKEN",
      [
        { product_id: carrot, quantity: 2 },
        { product_id: apple, quantity: 1 },
      ],
    ],
  ]); // 상품마다 따로 "더하기"를 부르지 않고 한 번에 보낸다
  assert.deepEqual(guest.store.items, []);
  assert.equal(guest.store.clears, 1);
});

test("합치기: 서버가 알려 준 건너뛴 상품 수(판매 종료·없는 상품)를 안내한다", async () => {
  const { api } = apiRecorder({
    merge: () => ({ merged: 1, skipped_product_ids: ["sold-1kg", "gone-1kg"] }),
  });
  const guest = fakeGuestStore([
    { productId: carrot, quantity: 1 },
    { productId: "sold-1kg", quantity: 1 },
    { productId: "gone-1kg", quantity: 1 },
  ]);
  const result = await loadActions({
    mode: fastapi,
    api,
    guest,
  }).mergeGuestCart();
  assert.deepEqual(result, { ok: true, merged: 1, skipped: 2 });
  assert.deepEqual(guest.store.items, []);
});

test("합치기: 응답이 유실돼 실패해도 쿠키를 남기고, 다시 보내도 같은 요청이라 수량이 두 번 더해지지 않는다", async () => {
  // 서버 쪽 장바구니를 흉내 내요: 서버는 요청을 반영했는데 응답만 실패하는 상황.
  const server = new Map([[carrot, 3]]);
  let dropResponse = true;
  const { api, calls } = apiRecorder({
    merge: (items) => {
      for (const { product_id, quantity } of items)
        server.set(product_id, Math.max(server.get(product_id) ?? 0, quantity)); // 서버는 큰 값으로 맞춘다
      if (dropResponse) throw new Error("fetch failed"); // 반영 후 응답 유실
      return { merged: items.length, skipped_product_ids: [] };
    },
  });
  const guest = fakeGuestStore([
    { productId: carrot, quantity: 2 },
    { productId: apple, quantity: 1 },
  ]);
  const { mergeGuestCart } = loadActions({ mode: fastapi, api, guest });

  const first = await mergeGuestCart();
  assert.equal(first.ok, false);
  assert.equal(guest.store.items.length, 2); // 성공을 확인하지 못했으니 쿠키는 그대로
  assert.equal(guest.store.clears, 0);

  dropResponse = false; // 새로고침해서 다시 시도
  assert.deepEqual(await mergeGuestCart(), { ok: true, merged: 2, skipped: 0 });
  assert.deepEqual(
    [...server],
    [
      [carrot, 3],
      [apple, 1],
    ],
  ); // 3+2=5 나 1+1=2 가 아니다
  assert.deepEqual(guest.store.items, []);
  assert.equal(calls.length, 2);
});

test("합치기: 서버 장애(5xx)는 쿠키를 남겨 다시 시도할 수 있게 한다", async () => {
  const { api } = apiRecorder({
    merge: () => {
      throw new FastApiError(503, "일시 장애");
    },
  });
  const guest = fakeGuestStore([{ productId: carrot, quantity: 2 }]);
  const result = await loadActions({
    mode: fastapi,
    api,
    guest,
  }).mergeGuestCart();
  assert.equal(result.ok, false);
  assert.doesNotMatch(result.error, /일시 장애/); // 내부 오류 문구는 숨긴다
  assert.deepEqual(guest.store.items, [{ productId: carrot, quantity: 2 }]);
});

test("합치기: 요청이 거부되면(4xx) 다시 보내도 성공할 수 없어 쿠키를 지운다", async () => {
  const { api } = apiRecorder({
    merge: () => {
      throw new FastApiError(422, "요청 형식 오류");
    },
  });
  const guest = fakeGuestStore([
    { productId: carrot, quantity: 2 },
    { productId: apple, quantity: 1 },
  ]);
  const result = await loadActions({
    mode: fastapi,
    api,
    guest,
  }).mergeGuestCart();
  assert.deepEqual(result, { ok: true, merged: 0, skipped: 2 });
  assert.deepEqual(guest.store.items, []);
});

test("합치기: 로그인이 풀렸으면(401) 쿠키를 지우지 않고 로그인이 필요하다고 알린다", async () => {
  const { api } = apiRecorder({
    merge: () => {
      throw new FastApiError(401, "로그아웃된 토큰입니다.");
    },
  });
  const guest = fakeGuestStore([{ productId: carrot, quantity: 1 }]);
  const result = await loadActions({
    mode: fastapi,
    api,
    guest,
  }).mergeGuestCart();
  assert.equal(result.ok, false);
  assert.deepEqual(guest.store.items, [{ productId: carrot, quantity: 1 }]);
});

test("합치기: 비회원·데모·Supabase 사용자에게는 아무 일도 하지 않는다", async () => {
  for (const mode of [
    { kind: "guest" },
    { kind: "demo" },
    { kind: "supabase", userId: "u" },
  ]) {
    const { api, calls } = apiRecorder();
    const guest = fakeGuestStore([{ productId: carrot, quantity: 1 }]);
    const result = await loadActions({ mode, api, guest }).mergeGuestCart();
    assert.deepEqual(result, { ok: true, merged: 0, skipped: 0 });
    assert.deepEqual(calls, []);
    assert.equal(guest.store.items.length, 1);
  }
});

test("합치기: 비어 있으면 FastAPI 를 부르지 않는다", async () => {
  const { api, calls } = apiRecorder();
  const result = await loadActions({ mode: fastapi, api }).mergeGuestCart();
  assert.deepEqual(result, { ok: true, merged: 0, skipped: 0 });
  assert.deepEqual(calls, []);
});

// ---------- 품절·판매 중지 상품 (서현 님 관리자 설정) ----------

test("품절·판매 중지 상품은 비회원·FastAPI 로그인 모두 담기 전에 차단한다", async () => {
  const guest = fakeGuestStore();
  const blockedGuest = loadActions({
    user: null,
    guest,
    active,
    unavailable: true,
  });
  const guestResult = await blockedGuest.addToCart({
    product_id: carrot,
    quantity: 1,
  });
  assert.equal(guestResult.ok, false);
  assert.match(guestResult.error, /품절/);
  assert.equal(guest.store.saves, 0);

  const { api, calls } = apiRecorder();
  const blockedApi = loadActions({ mode: fastapi, api, unavailable: true });
  const apiResult = await blockedApi.addToCart({
    product_id: carrot,
    quantity: 1,
  });
  assert.equal(apiResult.ok, false);
  assert.match(apiResult.error, /품절/);
  assert.deepEqual(calls, []);
});
