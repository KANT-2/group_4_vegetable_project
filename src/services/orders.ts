import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getCustomerDemo } from "@/lib/customer-demo";
import {
  customerDemoOrders,
  customerDemoRefundOrders,
} from "@/lib/customer-demo-orders";
import { getCartMode } from "@/lib/cart-mode";
import { apiGetOrder, apiGetOrders, type ApiOrder } from "@/lib/cart-api";
import { FastApiError } from "@/lib/fastapi";

// FastAPI 주문을 기존 주문 화면이 읽는 모양(주문 행 + 주문 상품)으로 바꿔요. 환불은 FastAPI 범위가 아니라 없어요.
function toOrderRow(order: ApiOrder, userId: string) {
  return {
    id: order.id,
    user_id: userId,
    status: order.status,
    total_amount: order.total_amount,
    shipping_fee: order.shipping_fee,
    created_at: order.created_at,
    paid_at: order.paid_at,
    payment_method: order.payment_method,
    recipient_name: order.shipping.recipient_name,
    recipient_phone: order.shipping.recipient_phone,
    postal_code: order.shipping.postal_code,
    address: order.shipping.address,
    address_detail: order.shipping.address_detail,
    order_items: order.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_unit: item.product_unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
    refund_requests: null,
  };
}

export async function getOrders(page = 1, refundsOnly = false) {
  const pageSize = 12;
  if (await getCustomerDemo()) {
    const orders = refundsOnly ? customerDemoRefundOrders : customerDemoOrders;
    return {
      userId: "customer-demo-qwer",
      orders: orders.slice((page - 1) * pageSize, page * pageSize),
      count: orders.length,
      page,
      pageSize,
    };
  }
  const mode = await getCartMode();
  if (mode.kind === "fastapi") {
    // 환불·취소 내역은 FastAPI 주문 범위가 아니라서 비어 있어요.
    if (refundsOnly)
      return { userId: mode.userId, orders: [], count: 0, page, pageSize };
    const result = await apiGetOrders(mode.token, page, pageSize);
    return {
      userId: mode.userId,
      orders: result.items.map((order) => toOrderRow(order, mode.userId)),
      count: result.total,
      page,
      pageSize,
    };
  }
  const user = await requireUser("/mypage/orders");
  const supabase = await createClient();
  let query = supabase
    .from("orders")
    .select(
      "id, status, total_amount, shipping_fee, created_at, paid_at, payment_method, recipient_name, recipient_phone, postal_code, address, address_detail, order_items(product_id, product_name, product_unit, quantity, unit_price), refund_requests(status)",
      { count: "exact" },
    )
    .eq("user_id", user.id);
  if (refundsOnly) {
    const refunds = await supabase.from("refund_requests").select("order_id");
    if (refunds.error) throw new Error("환불내역을 불러오지 못했습니다.");
    const ids = refunds.data.map((refund) => refund.order_id);
    query = ids.length
      ? query.or(`status.eq.cancelled,id.in.(${ids.join(",")})`)
      : query.eq("status", "cancelled");
  }
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("주문내역을 불러오지 못했습니다.");
  return { userId: user.id, orders: data, count: count ?? 0, page, pageSize };
}

export async function getOrder(orderId: string) {
  const mode = await getCartMode();
  if (mode.kind === "fastapi") {
    if (!z.uuid().safeParse(orderId).success) return null;
    try {
      const order = await apiGetOrder(mode.token, orderId);
      return {
        order: toOrderRow(order, mode.userId),
        items: order.items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_unit: item.product_unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        refund: null,
      };
    } catch (error) {
      // 없는 주문이거나 남의 주문이면 FastAPI 가 같은 404 를 돌려줘요.
      if (error instanceof FastApiError && error.status === 404) return null;
      throw error;
    }
  }
  const user = await requireUser(`/mypage/orders/${orderId}`);
  if (!z.uuid().safeParse(orderId).success) return null;
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error("주문을 불러오지 못했습니다.");
  if (!order) return null;
  const [items, refund] = await Promise.all([
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("product_name"),
    supabase
      .from("refund_requests")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle(),
  ]);
  if (items.error || refund.error)
    throw new Error("주문 상세를 불러오지 못했습니다.");
  return { order, items: items.data, refund: refund.data };
}
