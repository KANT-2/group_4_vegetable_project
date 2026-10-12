import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { NavigationState } from "@/types/navigation";

const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };

export async function GET() {
  try {
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
    const [profile, cart] = await Promise.all([
      supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("cart_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);
    if (profile.error || cart.error)
      throw new Error("navigation lookup failed");
    return Response.json(
      {
        user: { id: user.id, nickname: profile.data?.nickname ?? "회원" },
        cartCount: cart.count ?? 0,
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
