"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { shippingSchema } from "@/schemas/shipping";

const checkoutSchema = z
  .object({
    requestKey: z.uuid(),
    userId: z.uuid(),
    shipping: shippingSchema,
    items: z
      .array(
        z
          .object({
            product_id: z.string().min(1),
            quantity: z.number().int().min(1).max(99),
            unit_price: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1),
    success: z.boolean(),
  })
  .strict();

export async function mockCheckout(
  input: unknown,
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  try {
    const user = await getCurrentUser();
    if (!user || user.id !== parsed.data.userId)
      return {
        ok: false,
        error: "로그인 계정이 변경됐어요. 새로고침 후 다시 진행해 주세요.",
      };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("mock_checkout", {
      p_request_key: parsed.data.requestKey,
      p_shipping: parsed.data.shipping,
      p_expected_items: parsed.data.items.sort((a, b) =>
        a.product_id < b.product_id ? -1 : a.product_id > b.product_id ? 1 : 0,
      ),
      p_success: parsed.data.success,
    });
    if (error || !data)
      return {
        ok: false,
        error:
          error?.message.includes("CART_CHANGED") ||
          error?.message.includes("EMPTY_CART")
            ? "상품 가격이나 장바구니가 변경됐어요. 장바구니에서 다시 확인해 주세요."
            : "모의 결제를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
      };
    revalidatePath("/cart");
    revalidatePath("/mypage/orders");
    return { ok: true, orderId: data };
  } catch {
    return { ok: false, error: "연결을 확인하고 다시 시도해 주세요." };
  }
}
