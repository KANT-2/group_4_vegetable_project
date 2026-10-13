import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrder } from "@/services/orders";
import { AccountGuard } from "@/components/account/AccountGuard";
import { AccountLayout } from "@/components/account/AccountLayout";
import { OrderReceipt } from "@/components/orders/OrderReceipt";

export const metadata: Metadata = { title: "주문 상세" };
type Params = Promise<{ id: string }>;
async function OrderDetails({ params }: { params: Params }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result) notFound();
  return (
    <AccountGuard userId={result.order.user_id}>
      <OrderReceipt
        order={result.order}
        items={result.items}
        refund={result.refund}
      />
    </AccountGuard>
  );
}
export default function OrderPage({ params }: { params: Params }) {
  return (
    <AccountLayout
      active="orders"
      title="주문 상세"
      description="주문한 상품과 결제·배송 정보를 확인하세요."
    >
      <Suspense
        fallback={
          <p role="status" className="rounded-xl bg-surface p-6">
            주문을 불러오고 있어요.
          </p>
        }
      >
        <OrderDetails params={params} />
      </Suspense>
    </AccountLayout>
  );
}
