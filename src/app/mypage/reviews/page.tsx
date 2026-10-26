import { Suspense } from "react";
import { getOrders } from "@/services/orders";
import { AccountLayout } from "@/components/account/AccountLayout";
import { AccountGuard } from "@/components/account/AccountGuard";
import { OrderReviewButton } from "@/components/orders/OrderReviewButton";
import { formatOrderDate } from "@/lib/orders";

export const metadata = { title: "나의 리뷰" };
async function Reviews() {
  const result = await getOrders();
  const orders = result.orders.filter((order) => order.status === "paid");
  return <AccountGuard userId={result.userId}>
    <p className="mb-5 text-sm text-ink-muted">주문한 상품의 리뷰를 작성하거나 저장한 리뷰를 수정할 수 있어요.</p>
    <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
      {orders.map((order) => <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div><p className="font-bold">{order.order_items[0]?.product_name}{order.order_items.length > 1 ? ` 외 ${order.order_items.length - 1}종` : ""}</p><p className="mt-2 text-xs text-ink-muted">{formatOrderDate(order.created_at)}</p></div>
        <OrderReviewButton userId={result.userId} orderId={order.id} items={order.order_items} />
      </li>)}
    </ul>
    {!orders.length && <p className="py-16 text-center text-sm text-ink-muted">리뷰를 작성할 주문이 없습니다.</p>}
  </AccountGuard>;
}
export default function ReviewPage() {
  return <AccountLayout active="reviews" title="나의 리뷰" description="구매한 상품의 경험을 들려주세요."><Suspense fallback={<p>리뷰를 불러오고 있어요.</p>}><Reviews /></Suspense></AccountLayout>;
}
