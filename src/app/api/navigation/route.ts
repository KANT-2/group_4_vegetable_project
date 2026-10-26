import { getCurrentUser } from "@/lib/auth";
import { getCartMode } from "@/lib/cart-mode";
import { apiGetCart } from "@/lib/cart-api";
import { fastApi, type FastApiUser } from "@/lib/fastapi";
import { guestCartCount } from "@/lib/guest-cart-core";
import { readGuestCart } from "@/lib/guest-cart";
import { createClient } from "@/lib/supabase/server";
import type { NavigationState } from "@/types/navigation";
import { getCustomerDemo } from "@/lib/customer-demo";
import { readDemoWishlist } from "@/lib/customer-demo-wishlist";
import { readDemoCart } from "@/lib/customer-demo-cart";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  try {
    const demo = await getCustomerDemo();
    if (demo)
      return Response.json(
        {
          user: {
            id: "customer-demo-qwer",
            nickname: demo.nickname,
            email: demo.email,
          },
          cartCount: readDemoCart().reduce(
            (total, item) => total + item.quantity,
            0,
          ),
          wishlistIds: readDemoWishlist(),
        },
        { headers },
      );
    const mode = await getCartMode();
    if (mode.kind === "guest") {
      // 비회원: 로그인 정보 없이, 이 기기(쿠키)에 담아 둔 장바구니 수량만 알려 줘요.
      return Response.json(
        {
          user: null,
          cartCount: guestCartCount(await readGuestCart()),
        } satisfies NavigationState,
        { headers },
      );
    }
    if (mode.kind === "fastapi") {
      // FastAPI 로그인: 닉네임은 /accounts/me, 장바구니 수량은 FastAPI 장바구니에서 읽어요. (찜은 아직 FastAPI 에 없어요.)
      const [me, cart] = await Promise.all([
        fastApi<FastApiUser>("/api/v1/accounts/me", {}, mode.token),
        apiGetCart(mode.token),
      ]);
      return Response.json(
        {
          user: {
            id: me.id,
            nickname: me.profile.nickname,
            email: me.email,
          },
          cartCount: cart.items.reduce(
            (total, item) => total + item.quantity,
            0,
          ),
          wishlistIds: [],
        } satisfies NavigationState,
        { headers },
      );
    }
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { user: null, cartCount: 0 } satisfies NavigationState,
        { headers },
      );
    }
    const supabase = await createClient();
    const [profile, cart, wishlist] = await Promise.all([
      supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("cart_items").select("quantity").eq("user_id", user.id),
      supabase
        .from("wishlist_items")
        .select("product_id")
        .eq("user_id", user.id),
    ]);
    if (profile.error || cart.error || wishlist.error || !cart.data)
      throw new Error("navigation lookup failed");
    return Response.json(
      {
        user: {
          id: user.id,
          nickname: profile.data?.nickname ?? "회원",
          email: user.email,
        },
        cartCount: cart.data.reduce((total, item) => total + item.quantity, 0),
        wishlistIds: (wishlist.data ?? []).map((item) => item.product_id),
      } satisfies NavigationState,
      { headers },
    );
  } catch {
    return Response.json(
      { error: "개인 정보를 불러오지 못했어요." },
      { status: 503, headers },
    );
  }
}
