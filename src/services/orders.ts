import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function getOrders(page = 1) {
  const user = await requireUser("/mypage/orders");
  const supabase = await createClient();
  const pageSize = 20;
  const { data, error, count } = await supabase
    .from("orders")
    .select(
      "id, status, total_amount, created_at, order_items(product_name, quantity), refund_requests(status)",
      { count: "exact" },
    )
    .eq("user_id", user.id)
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
