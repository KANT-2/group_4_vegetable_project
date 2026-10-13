"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const schema = z
  .object({
    campaign_id: z.enum(["openrun-coupon", "first-box", "kimjang-coupon"]),
  })
  .strict();
type Result = { ok: true } | { ok: false; error: string; needsLogin?: boolean };
export async function claimCoupon(input: unknown): Promise<Result> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "발급 가능한 쿠폰이 아니에요." };
  try {
    const user = await getCurrentUser();
    if (!user)
      return {
        ok: false,
        error: "로그인 후 받을 수 있어요.",
        needsLogin: true,
      };
    const supabase = await createClient();
    const { error } = await supabase.rpc("claim_coupon", {
      p_campaign_id: parsed.data.campaign_id,
    });
    if (error) {
      const messages: Record<string, string> = {
        ISSUANCE_TIME: "오픈런 쿠폰은 오전 7시부터 11시까지 받을 수 있어요.",
        FIRST_PURCHASE_ONLY:
          "첫 구매 쿠폰은 결제 완료 이력이 없는 회원만 받을 수 있어요.",
        CAMPAIGN_CLOSED: "쿠폰 발급 기간이 끝났거나 아직 시작되지 않았어요.",
        INVALID_COUPON: "발급 가능한 쿠폰이 아니에요.",
      };
      return {
        ok: false,
        error:
          messages[error.message] ??
          "쿠폰을 받지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
    }
    revalidatePath("/cart");
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "쿠폰을 받지 못했어요. 연결 상태를 확인해 주세요.",
    };
  }
}
