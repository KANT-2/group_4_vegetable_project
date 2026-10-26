import { getCurrentUser } from "@/lib/auth";
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
    const user = await getCurrentUser();
    if (!user) {
      return Response.json(
        { user: null, cartCount: 0 } satisfies NavigationState,
        {
          headers,
        },
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
