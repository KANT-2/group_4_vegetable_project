import "server-only";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CartLine, WishlistLine } from "@/lib/cart";
import { toImageSrc } from "./catalog-source";

const PRODUCT_FIELDS =
  "products(id, name, unit, price, original_price, image_path, is_active)";

type ProductRow = {
  id: string;
  name: string;
  unit: string;
  price: number;
  original_price: number;
  image_path: string | null;
  is_active: boolean;
} | null;

// 판매 종료 상품은 RLS로 읽히지 않아 null 이 돼요.
function toProductInfo(productId: string, product: ProductRow) {
  if (!product || !product.is_active)
    return {
      available: false,
      name: "판매가 끝난 상품",
      unit: "",
      price: 0,
      originalPrice: 0,
      imageUrl: undefined,
    };
  return {
    available: true,
    name: product.name,
    unit: product.unit,
    price: product.price,
    originalPrice: product.original_price,
    imageUrl: toImageSrc(product.image_path),
  };
}

export async function getCart(): Promise<{
  userId: string;
  lines: CartLine[];
}> {
  const user = await requireUser("/cart");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select(`product_id, quantity, ${PRODUCT_FIELDS}`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("장바구니를 불러오지 못했어요.");
  return {
    userId: user.id,
    lines: data.map((row) => ({
      productId: row.product_id,
      quantity: row.quantity,
      ...toProductInfo(row.product_id, row.products as ProductRow),
    })),
  };
}

export async function getWishlist(): Promise<{
  userId: string;
  lines: WishlistLine[];
}> {
  const user = await requireUser("/cart?tab=wishlist");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishlist_items")
    .select(`product_id, ${PRODUCT_FIELDS}`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("찜 목록을 불러오지 못했어요.");
  return {
    userId: user.id,
    lines: data.map((row) => ({
      productId: row.product_id,
      ...toProductInfo(row.product_id, row.products as ProductRow),
    })),
  };
}

// 상품 상세의 버튼 초기 상태. 로그인 전이거나 조회에 실패하면 "찜 안 함"으로 보여요.
export async function getSavedState(productId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { loggedIn: false, wished: false };
    const supabase = await createClient();
    const { data } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();
    return { loggedIn: true, wished: !!data };
  } catch {
    return { loggedIn: false, wished: false };
  }
}
