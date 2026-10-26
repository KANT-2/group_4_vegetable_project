import "server-only";
import { cookies } from "next/headers";
import {
  GUEST_CART_COOKIE,
  parseGuestCart,
  serializeGuestCart,
  type GuestCartItem,
} from "./guest-cart-core.ts";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

// 비회원 장바구니는 JavaScript가 읽을 수 없는 HttpOnly 쿠키에 둬요. (localStorage 사용 금지)
export async function readGuestCart(): Promise<GuestCartItem[]> {
  return parseGuestCart((await cookies()).get(GUEST_CART_COOKIE)?.value);
}

export async function saveGuestCart(items: GuestCartItem[]): Promise<void> {
  const store = await cookies();
  if (!items.length) {
    store.delete(GUEST_CART_COOKIE);
    return;
  }
  store.set(GUEST_CART_COOKIE, serializeGuestCart(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THIRTY_DAYS,
  });
}

export async function clearGuestCart(): Promise<void> {
  (await cookies()).delete(GUEST_CART_COOKIE);
}
