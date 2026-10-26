import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDemo } from "@/lib/customer-demo";

export async function getCouponWallet() {
  const checkedAt = Date.now();
  if (await getCustomerDemo()) return { checkedAt, userId: "customer-demo-qwer", coupons: [], error: null };
  const user = await requireUser("/cart?tab=coupons");
  const supabase = await createClient();
  const [wallet, campaigns] = await Promise.all([
    supabase
      .from("user_coupons")
      .select("*")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false }),
    supabase.from("coupon_campaigns").select("*"),
  ]);
  if (wallet.error || campaigns.error)
    return {
      checkedAt,
      userId: user.id,
      coupons: [],
      error: "쿠폰을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
    };
  const byId = new Map(
    campaigns.data.map((campaign) => [campaign.id, campaign]),
  );
  return {
    checkedAt,
    userId: user.id,
    error: null,
    coupons: wallet.data.flatMap((coupon) => {
      const campaign = byId.get(coupon.campaign_id);
      return campaign ? [{ ...coupon, campaign }] : [];
    }),
  };
}
