import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { getCustomerDemo } from "@/lib/customer-demo";
import { customerDemoOrders, customerDemoRefundOrders } from "@/lib/customer-demo-orders";

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
    query = ids.length ? query.or(`status.eq.cancelled,id.in.(${ids.join(",")})`) : query.eq("status", "cancelled");
  }
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("주문내역을 불러오지 못했습니다.");
  return { userId: user.id, orders: data, count: count ?? 0, page, pageSize };
}

export async function getOrder(orderId: string) {
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
