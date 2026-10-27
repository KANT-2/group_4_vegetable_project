// 비회원 장바구니 규칙(순수 함수). 쿠키 읽기·쓰기는 guest-cart.ts, 화면은 장바구니 화면이 맡아요.
// 팀 합의(2026-10-26)와 같은 규칙: 수량 1~99, 합쳐서 99를 넘으면 자르지 않고 거부해요.
// 비회원 장바구니는 브라우저(HttpOnly 쿠키)에만 있고, 로그인하면 계정 장바구니로 합쳐요. 주문·결제는 로그인이 필요해요.

export const GUEST_CART_COOKIE = "ugly_market_guest_cart";
export const GUEST_CART_MAX_LINES = 50; // 쿠키 크기(약 4KB)를 넘지 않게 상품 종류 수를 제한해요.
export const GUEST_MAX_QUANTITY = 99;

export type GuestCartItem = { productId: string; quantity: number };

const PRODUCT_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function validProductId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length <= 100 && PRODUCT_ID.test(value)
  );
}

function validQuantity(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 1 &&
    (value as number) <= GUEST_MAX_QUANTITY
  );
}

// 쿠키 값을 읽어요. 망가졌거나 사람이 고친 값은 버리고, 올바른 줄만 남겨요. (쿠키는 믿을 수 없는 입력이에요.)
export function parseGuestCart(
  raw: string | null | undefined,
): GuestCartItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const items: GuestCartItem[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const { p, q } = entry as { p?: unknown; q?: unknown };
    if (!validProductId(p) || !validQuantity(q) || seen.has(p)) continue;
    seen.add(p);
    items.push({ productId: p, quantity: q });
    if (items.length >= GUEST_CART_MAX_LINES) break;
  }
  return items;
}

export function serializeGuestCart(items: GuestCartItem[]): string {
  return JSON.stringify(
    items.map((item) => ({ p: item.productId, q: item.quantity })),
  );
}

export type GuestCartChange =
  | { ok: true; items: GuestCartItem[]; quantity: number }
  | { ok: false; error: string };

// 담기(add)·수량 변경(update)·삭제(remove). 원래 배열은 바꾸지 않고 새 배열을 돌려줘요.
export function changeGuestCart(
  items: GuestCartItem[],
  productId: string,
  mode: "add" | "update" | "remove",
  quantity = 1,
): GuestCartChange {
  if (!validProductId(productId))
    return { ok: false, error: "상품 정보를 확인해 주세요." };
  const previous = items.find((item) => item.productId === productId);
  if (mode === "remove") {
    return {
      ok: true,
      items: items.filter((item) => item.productId !== productId),
      quantity: 0,
    };
  }
  if (!validQuantity(quantity))
    return {
      ok: false,
      error: `수량은 1개 이상 ${GUEST_MAX_QUANTITY}개까지 담을 수 있어요.`,
    };
  if (mode === "update" && !previous)
    return { ok: false, error: "장바구니에 없는 상품이에요." };
  const next = mode === "add" ? (previous?.quantity ?? 0) + quantity : quantity;
  if (next > GUEST_MAX_QUANTITY)
    return {
      ok: false,
      error: `한 상품은 ${GUEST_MAX_QUANTITY}개까지 담을 수 있어요.`,
    };
  if (!previous && items.length >= GUEST_CART_MAX_LINES)
    return {
      ok: false,
      error: `장바구니에는 ${GUEST_CART_MAX_LINES}종류까지 담을 수 있어요.`,
    };
  const rest = items.filter((item) => item.productId !== productId);
  // 새로 담은(또는 바꾼) 상품이 맨 위에 보이게 해요. 기존 장바구니 화면의 정렬(최근 순)과 같아요.
  return {
    ok: true,
    items: [{ productId, quantity: next }, ...rest],
    quantity: next,
  };
}

export function guestCartCount(items: GuestCartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
