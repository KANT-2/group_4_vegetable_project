"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
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

// DB 수정 대상은 항상 서버에서 확인한 로그인 사용자로 정해요.
async function currentUserId() {
  const user = await getCurrentUser();
  return user?.id ?? null;
}

function refreshPages(productId: string) {
  revalidatePath("/cart");
  revalidatePath(`/products/${productId}`);
}

// 담기: 이미 있으면 수량을 더하고 99개를 넘지 않게 해요.
export async function addToCart(input: unknown): Promise<CartActionResult> {
  const parsed = cartItemSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const { product_id, quantity } = parsed.data;
  try {
    const userId = await currentUserId();
    if (!userId) return LOGIN_REQUIRED;
    const supabase = await createClient();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", product_id)
      .eq("is_active", true)
      .maybeSingle();
    if (productError) return SERVER_ERROR;
    if (!product)
      return { ok: false, error: "지금 판매 중인 상품이 아니에요." };

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
  } catch {
    return SERVER_ERROR;
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
    const userId = await currentUserId();
    if (!userId) return LOGIN_REQUIRED;
    const supabase = await createClient();
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("user_id", userId)
      .eq("product_id", product_id);
    if (error) return SERVER_ERROR;
    refreshPages(product_id);
    return { ok: true, quantity };
  } catch {
    return SERVER_ERROR;
  }
}

export async function removeFromCart(
  input: unknown,
): Promise<CartActionResult> {
  const parsed = cartRemoveSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  try {
    const userId = await currentUserId();
    if (!userId) return LOGIN_REQUIRED;
    const supabase = await createClient();
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", parsed.data.product_id);
    if (error) return SERVER_ERROR;
    refreshPages(parsed.data.product_id);
    return { ok: true };
  } catch {
    return SERVER_ERROR;
  }
}

// 찜 추가·해제. 이미 찜한 상품을 다시 찜해도(중복 클릭) 성공으로 봐요.
export async function setWishlist(input: unknown): Promise<CartActionResult> {
  const parsed = wishlistSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const { product_id, wished } = parsed.data;
  try {
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
