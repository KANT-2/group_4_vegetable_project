"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDemo } from "@/lib/customer-demo";
import { writeDemoWish } from "@/lib/customer-demo-wishlist";
import { getProductById } from "@/services/products";
import { changeDemoCart } from "@/lib/customer-demo-cart";
import { getCartMode } from "@/lib/cart-mode";
import {
  apiAddToCart,
  apiChangeQuantity,
  apiMergeCart,
  apiRemoveFromCart,
} from "@/lib/cart-api";
import { FastApiError } from "@/lib/fastapi";
import { changeGuestCart } from "@/lib/guest-cart-core";
import { clearGuestCart, readGuestCart, saveGuestCart } from "@/lib/guest-cart";
import { productUnavailable } from "@/lib/managed-content";
import { catalogToken } from "@/lib/catalog-api";
import { changeCatalogWish } from "./catalog-wishlist";
import { isFastApiCatalog } from "@/lib/catalog-mode";
import {
  MAX_CART_QUANTITY,
  cartItemSchema,
  cartRemoveSchema,
  wishlistSchema,
} from "@/schemas/cart";

// needsLogin: 화면에서 로그인 페이지로 보낸 뒤 원래 화면으로 돌아오게 해요.
export type CartActionResult =
  | { ok: true; quantity?: number }
  | { ok: false; error: string; needsLogin?: boolean };

const LOGIN_REQUIRED: CartActionResult = {
  ok: false,
  error: "로그인이 필요해요.",
  needsLogin: true,
};
const SERVER_ERROR: CartActionResult = {
  ok: false,
  error: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
};
const NOT_FOR_SALE: CartActionResult = {
  ok: false,
  error: "지금 판매 중인 상품이 아니에요.",
};

// DB 수정 대상은 항상 서버에서 확인한 로그인 사용자로 정해요. (찜 기능에서 사용)
async function currentUserId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

function refreshPages(productId: string) {
  revalidatePath("/cart");
  revalidatePath(`/products/${productId}`);
}

// FastAPI 가 돌려준 사람이 읽을 수 있는 오류(404·409·422)는 그대로 보여 주고, 나머지는 일반 오류로 처리해요.
function fromApiError(error: unknown): CartActionResult {
  if (error instanceof FastApiError) {
    if (error.status === 401) return LOGIN_REQUIRED;
    if ([404, 409, 422].includes(error.status))
      return { ok: false, error: error.message };
  }
  return SERVER_ERROR;
}

// 장바구니는 로그인하지 않아도 쓸 수 있어요(비회원은 브라우저 쿠키에 보관). 주문·결제는 로그인이 필요해요.
// 담기: 이미 있으면 수량을 더해요. 합쳐서 99개를 넘으면 자르지 않고 알려 줘요(FastAPI·비회원).
export async function addToCart(input: unknown): Promise<CartActionResult> {
  const parsed = cartItemSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const { product_id, quantity } = parsed.data;
  if (productUnavailable(product_id))
    return { ok: false, error: "품절 또는 판매 중지된 상품입니다." };
  try {
    const mode = await getCartMode();
    if (mode.kind === "demo") {
      if (!(await getProductById(product_id))) return NOT_FOR_SALE;
      const saved = changeDemoCart(product_id, "add", quantity);
      refreshPages(product_id);
      return { ok: true, quantity: saved };
    }
    if (mode.kind === "guest") {
      // 비회원도 판매 중인 상품만 담을 수 있어요.
      if (!(await getProductById(product_id))) return NOT_FOR_SALE;
      const changed = changeGuestCart(
        await readGuestCart(),
        product_id,
        "add",
        quantity,
      );
      if (!changed.ok) return { ok: false, error: changed.error };
      await saveGuestCart(changed.items);
      refreshPages(product_id);
      return { ok: true, quantity: changed.quantity };
    }
    if (mode.kind === "fastapi") {
      const line = await apiAddToCart(mode.token, product_id, quantity);
      refreshPages(product_id);
      return { ok: true, quantity: line.quantity };
    }

    const userId = mode.userId;
    const supabase = await createClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", product_id)
      .eq("is_active", true)
      .maybeSingle();
    if (productError) return SERVER_ERROR;
    if (!product) return NOT_FOR_SALE;

    const addTo = async () => {
      const { data: existing, error } = await supabase
        .from("cart_items")
        .select("quantity")
        .eq("user_id", userId)
        .eq("product_id", product_id)
        .maybeSingle();
      if (error) return null;
      if (!existing) return 0;
      const next = Math.min(MAX_CART_QUANTITY, existing.quantity + quantity);
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: next })
        .eq("user_id", userId)
        .eq("product_id", product_id);
      return updateError ? null : next;
    };

    let saved = await addTo();
    if (saved === null) return SERVER_ERROR;
    if (saved === 0) {
      const { error } = await supabase
        .from("cart_items")
        .insert({ user_id: userId, product_id, quantity });
      if (!error) saved = quantity;
      // 다른 탭에서 동시에 담은 경우: 이미 생긴 줄에 수량을 더해요.
      else if (error.code === "23505") saved = await addTo();
      else return SERVER_ERROR;
      if (!saved) return SERVER_ERROR;
    }
    refreshPages(product_id);
    return { ok: true, quantity: saved };
  } catch (error) {
    return fromApiError(error);
  }
}

export async function updateCartQuantity(
  input: unknown,
): Promise<CartActionResult> {
  const parsed = cartItemSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const { product_id, quantity } = parsed.data;
  try {
    const mode = await getCartMode();
    if (mode.kind === "demo") {
      if (!(await getProductById(product_id))) return NOT_FOR_SALE;
      const saved = changeDemoCart(product_id, "update", quantity);
      refreshPages(product_id);
      return { ok: true, quantity: saved };
    }
    if (mode.kind === "guest") {
      const changed = changeGuestCart(
        await readGuestCart(),
        product_id,
        "update",
        quantity,
      );
      if (!changed.ok) return { ok: false, error: changed.error };
      await saveGuestCart(changed.items);
      refreshPages(product_id);
      return { ok: true, quantity: changed.quantity };
    }
    if (mode.kind === "fastapi") {
      const line = await apiChangeQuantity(mode.token, product_id, quantity);
      refreshPages(product_id);
      return { ok: true, quantity: line.quantity };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("user_id", mode.userId)
      .eq("product_id", product_id);
    if (error) return SERVER_ERROR;
    refreshPages(product_id);
    return { ok: true, quantity };
  } catch (error) {
    return fromApiError(error);
  }
}

export async function removeFromCart(
  input: unknown,
): Promise<CartActionResult> {
  const parsed = cartRemoveSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  try {
    const mode = await getCartMode();
    if (mode.kind === "demo") {
      changeDemoCart(parsed.data.product_id, "remove");
      refreshPages(parsed.data.product_id);
      return { ok: true };
    }
    if (mode.kind === "guest") {
      const changed = changeGuestCart(
        await readGuestCart(),
        parsed.data.product_id,
        "remove",
      );
      if (!changed.ok) return { ok: false, error: changed.error };
      await saveGuestCart(changed.items);
      refreshPages(parsed.data.product_id);
      return { ok: true };
    }
    if (mode.kind === "fastapi") {
      try {
        await apiRemoveFromCart(mode.token, parsed.data.product_id);
      } catch (error) {
        // 이미 지워진 상품(다른 탭 등)을 또 지워도 결과는 같으니 성공으로 봐요.
        if (!(error instanceof FastApiError && error.status === 404))
          throw error;
      }
      refreshPages(parsed.data.product_id);
      return { ok: true };
    }
    const supabase = await createClient();
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", mode.userId)
      .eq("product_id", parsed.data.product_id);
    if (error) return SERVER_ERROR;
    refreshPages(parsed.data.product_id);
    return { ok: true };
  } catch (error) {
    return fromApiError(error);
  }
}

// 로그인한 뒤 비회원 장바구니를 계정 장바구니로 합쳐요. (FastAPI 로그인일 때만 동작)
// 서버 한 번 호출로 전체를 합치고, 수량은 더하지 않고 기존·비회원 중 큰 값으로 맞춰요. 그래서 서버는 반영했는데
// 응답만 유실돼 다시 시도해도(새로고침, 두 탭) 수량이 두 번 더해지지 않아요. 성공해야만 쿠키를 지워요.
export type MergeResult =
  { ok: true; merged: number; skipped: number } | { ok: false; error: string };

export async function mergeGuestCart(): Promise<MergeResult> {
  try {
    const mode = await getCartMode();
    if (mode.kind !== "fastapi") return { ok: true, merged: 0, skipped: 0 };
    const items = await readGuestCart();
    if (!items.length) return { ok: true, merged: 0, skipped: 0 };
    try {
      const result = await apiMergeCart(
        mode.token,
        items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      );
      await clearGuestCart();
      revalidatePath("/cart");
      revalidatePath("/cart/checkout");
      return {
        ok: true,
        merged: result.merged,
        skipped: result.skipped_product_ids.length,
      };
    } catch (error) {
      if (error instanceof FastApiError && error.status === 401)
        return { ok: false, error: "로그인이 필요해요." };
      if (error instanceof FastApiError && error.status < 500) {
        // 요청 자체가 거부되면(형식 오류 등) 다시 보내도 성공할 수 없어서 쿠키를 지우고 합치지 못했다고 알려요.
        await clearGuestCart();
        return { ok: true, merged: 0, skipped: items.length };
      }
      throw error; // 서버 장애·연결 끊김: 쿠키를 남겨 다시 시도해요. (다시 보내도 안전해요.)
    }
  } catch {
    return {
      ok: false,
      error: "비회원 장바구니를 합치지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}

// 찜 추가·해제. 이미 찜한 상품을 다시 찜해도(중복 클릭) 성공으로 봐요. (찜은 로그인이 필요해요.)
export async function setWishlist(input: unknown): Promise<CartActionResult> {
  const parsed = wishlistSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const { product_id, wished } = parsed.data;
  try {
    if (isFastApiCatalog() || (await catalogToken()))
      return changeCatalogWish(parsed.data);
    if (await getCustomerDemo()) {
      if (wished && !(await getProductById(product_id))) return NOT_FOR_SALE;
      writeDemoWish(product_id, wished);
      refreshPages(product_id);
      return { ok: true };
    }
    const userId = await currentUserId();
    if (!userId) return LOGIN_REQUIRED;
    const supabase = await createClient();
    const { error } = wished
      ? await supabase
          .from("wishlist_items")
          .insert({ user_id: userId, product_id })
      : await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", product_id);
    if (error && !(wished && error.code === "23505")) return SERVER_ERROR;
    refreshPages(product_id);
    return { ok: true };
  } catch {
    return SERVER_ERROR;
  }
}
