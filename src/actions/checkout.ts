"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCartMode } from "@/lib/cart-mode";
import { apiPlaceOrder } from "@/lib/cart-api";
import { shippingFeeFor } from "@/lib/cart";
import { FastApiError } from "@/lib/fastapi";
import { checkoutShippingSchema } from "@/schemas/shipping";
import { productUnavailable } from "@/lib/managed-content";

const checkoutSchema = z
  .object({
    requestKey: z.uuid(),
    userId: z.uuid(),
    shipping: checkoutShippingSchema,
    paymentMethod: z.enum(["card", "bank_transfer", "easy_pay"], {
      error: "결제 수단을 선택해 주세요.",
    }),
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
  if (parsed.data.items.some((item) => productUnavailable(item.product_id)))
    return {
      ok: false,
      error:
        "품절 또는 판매 중지된 상품이 포함되어 있습니다. 장바구니를 확인해 주세요.",
    };
  try {
    const mode = await getCartMode();
    if (mode.kind === "fastapi") return placeFastApiOrder(mode, parsed.data);
    if (mode.kind === "guest")
      return { ok: false, error: "주문과 결제는 로그인한 뒤에 할 수 있어요." };
    const user = await getCurrentUser();
    if (!user || user.id !== parsed.data.userId)
      return {
        ok: false,
        error: "로그인 계정이 변경됐어요. 새로고침 후 다시 진행해 주세요.",
      };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("mock_checkout", {
      p_request_key: parsed.data.requestKey,
      p_shipping: {
        ...parsed.data.shipping,
        payment_method: parsed.data.paymentMethod,
      },
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

// FastAPI 주문: 서버가 장바구니·가격·판매 여부를 다시 확인해 주문을 만들고, 같은 request_key 로 다시 요청하면 기존 주문을 돌려줘요.
// 화면의 금액(expected_total_amount)은 서버 계산과 같은지 확인하는 용도예요. 다르면 주문하지 않아요.
async function placeFastApiOrder(
  mode: { token: string; userId: string },
  input: z.infer<typeof checkoutSchema>,
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  if (mode.userId !== input.userId)
    return {
      ok: false,
      error: "로그인 계정이 변경됐어요. 새로고침 후 다시 진행해 주세요.",
    };
  const itemsTotal = input.items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );
  try {
    const order = await apiPlaceOrder(mode.token, {
      request_key: input.requestKey,
      shipping: input.shipping,
      payment_method: input.paymentMethod,
      expected_total_amount: itemsTotal + shippingFeeFor(itemsTotal),
    });
    revalidatePath("/cart");
    revalidatePath("/mypage/orders");
    return { ok: true, orderId: order.id };
  } catch (error) {
    if (error instanceof FastApiError) {
      if (error.status === 401)
        return { ok: false, error: "로그인이 필요해요. 다시 로그인해 주세요." };
      // 409(장바구니·가격 변경, 빈 장바구니, 판매 종료)·422(입력 오류)는 서버가 알려 준 문구를 그대로 보여 줘요.
      if (error.status === 409 || error.status === 422)
        return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: "모의 결제를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
    };
  }
}
