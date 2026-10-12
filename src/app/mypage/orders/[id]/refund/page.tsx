import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrder } from "@/services/orders";
import { formatPrice } from "@/lib/format";
import { formatOrderDate, refundStatusLabels } from "@/lib/orders";
import { AccountGuard } from "@/components/account/AccountGuard";
import { AccountNav } from "@/components/account/AccountNav";
import { RefundForm } from "@/components/account/RefundForm";

export const metadata: Metadata = { title: "환불 신청" };
type Params = Promise<{ id: string }>;

async function RefundContent({ params }: { params: Params }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result) notFound();
  const { order, refund } = result;
  return (
    <AccountGuard userId={order.user_id}>
      <div className="card p-6 sm:p-8">
        <p className="break-all text-sm text-ink-muted">주문번호 {order.id}</p>
        <p className="mt-3 font-bold">
          전체 주문금액 {formatPrice(order.total_amount)}
        </p>
        <p className="mt-3 text-ink-muted">
          모의 결제 주문의 전체 환불 신청을 접수해요. 신청은 처리 완료와 다르며,
          실제 돈이 환불되는 기능은 아니에요.
        </p>
        {refund ? (
          <div className="mt-6" role="status">
            <h2 className="text-xl font-bold text-brand">
              {refundStatusLabels[refund.status] ?? "신청 상태 확인 필요"}
            </h2>
            <p className="mt-2 text-ink-muted">
              접수일 {formatOrderDate(refund.created_at)}
            </p>
            <h3 className="mt-4 font-bold">신청 사유</h3>
            <p className="mt-2 whitespace-pre-wrap break-words">
              {refund.reason}
            </p>
            <p className="mt-4 text-ink-muted">
              동일한 주문에 중복 신청할 수 없어요.
            </p>
          </div>
        ) : order.status === "paid" ? (
          <RefundForm orderId={id} />
        ) : (
          <p className="mt-6 text-danger">
            결제 완료 주문만 환불을 신청할 수 있어요.
          </p>
        )}
      </div>
    </AccountGuard>
  );
}

export default function RefundPage({ params }: { params: Params }) {
  return (
    <section className="container-page section">
      <AccountNav active="orders" />
      <h1 className="page-title mb-8">환불 신청</h1>
      <Suspense fallback={<p role="status">신청 정보를 불러오고 있어요.</p>}>
        <RefundContent params={params} />
      </Suspense>
      <Link href="/mypage/orders" className="btn btn-secondary mt-6">
        주문내역으로
      </Link>
    </section>
  );
}
