"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { refundSchema } from "@/schemas/refund";
import type { ActionResult } from "@/types/action";
import { getCartMode } from "@/lib/cart-mode";
import { apiRequestRefund } from "@/lib/cart-api";
import { FastApiError } from "@/lib/fastapi";

function refreshOrderPages(orderId: string) {
  revalidatePath("/mypage/orders");
  revalidatePath(`/mypage/orders/${orderId}`);
  revalidatePath(`/mypage/orders/${orderId}/refund`);
}

// FastAPI 로그인 사용자의 환불 신청. 서버가 내 결제 완료 주문인지 확인하고 접수해요(접수만 하며 실제 환불은 아니에요).
async function requestFastApiRefund(
  token: string,
  orderId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    await apiRequestRefund(token, orderId, reason);
  } catch (error) {
    if (error instanceof FastApiError) {
      if (error.status === 401)
        return { ok: false, error: "로그인이 필요해요. 다시 로그인해 주세요." };
      if (error.status === 404)
        return {
          ok: false,
          error: "본인의 결제 완료 주문만 환불을 신청할 수 있어요.",
        };
      if (error.status === 409 || error.status === 422)
        return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: "환불 신청을 접수하지 못했어요. 다시 시도해 주세요.",
    };
  }
  refreshOrderPages(orderId);
  return { ok: true };
}

export async function requestRefund(input: unknown): Promise<ActionResult> {
  const parsed = refundSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const mode = await getCartMode();
  if (mode.kind === "fastapi")
    return requestFastApiRefund(
      mode.token,
      parsed.data.order_id,
      parsed.data.reason,
    );
  const user = await requireUser(
    `/mypage/orders/${parsed.data.order_id}/refund`,
  );
  try {
    const supabase = await createClient();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("id", parsed.data.order_id)
      .maybeSingle();
    if (orderError)
      return {
        ok: false,
        error: "주문 확인에 실패했어요. 다시 시도해 주세요.",
      };
    if (!order || order.status !== "paid")
      return {
        ok: false,
        error: "본인의 결제 완료 주문만 환불을 신청할 수 있어요.",
      };
    const { error } = await supabase
      .from("refund_requests")
      .insert(parsed.data);
    // 주문별 고유 키로 중복 클릭·재시도는 기존 신청을 유지합니다.
    if (error && error.code !== "23505")
      return {
        ok: false,
        error: "환불 신청을 접수하지 못했어요. 다시 시도해 주세요.",
      };
  } catch {
    return { ok: false, error: "환불 신청 서버에 연결할 수 없습니다." };
  }
  revalidatePath("/mypage/orders");
  revalidatePath(`/mypage/orders/${parsed.data.order_id}`);
  revalidatePath(`/mypage/orders/${parsed.data.order_id}/refund`);
  return { ok: true };
}
