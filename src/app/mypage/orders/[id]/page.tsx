import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrder } from "@/services/orders";
import { formatPrice } from "@/lib/format";
import {
  formatOrderDate,
  orderStatusLabels,
  refundStatusLabels,
} from "@/lib/orders";
import { AccountGuard } from "@/components/account/AccountGuard";
import { AccountNav } from "@/components/account/AccountNav";

export const metadata: Metadata = { title: "주문 상세" };
type Params = Promise<{ id: string }>;

async function OrderDetails({ params }: { params: Params }) {
  const { id } = await params;
  const result = await getOrder(id);
  if (!result) notFound();
  const { order, items, refund } = result;
  return (
    <AccountGuard userId={order.user_id}>
      <div className="card p-6 sm:p-8">
        <p className="font-bold text-brand">
          {orderStatusLabels[order.status] ?? "상태 확인 필요"}
        </p>
        <p className="mt-2 text-ink-muted">
          {formatOrderDate(order.created_at)}
        </p>
        <p className="mt-2 break-all text-sm text-ink-muted">
          주문번호 {order.id}
        </p>
        <h2 className="mb-4 mt-8 text-xl font-bold">주문 상품</h2>
        <ul className="divide-y divide-line">
          {items.map((item) => (
            <li
              key={item.product_id}
              className="flex flex-wrap justify-between gap-3 py-4"
            >
              <div>
                <p className="font-bold">{item.product_name}</p>
                <p className="text-ink-muted">
                  {item.product_unit} · {item.quantity}개 · 개당{" "}
                  {formatPrice(item.unit_price)}
                </p>
              </div>
              <p className="font-bold">
                {formatPrice(item.quantity * item.unit_price)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xl font-bold">
          총 주문금액 {formatPrice(order.total_amount)}
        </p>
        <h2 className="mb-4 mt-8 text-xl font-bold">주문 당시 배송지</h2>
        <dl className="space-y-3">
          <div>
            <dt className="font-bold">받는 분</dt>
            <dd>{order.recipient_name}</dd>
          </div>
          <div>
            <dt className="font-bold">연락처</dt>
            <dd>{order.recipient_phone}</dd>
          </div>
          <div>
            <dt className="font-bold">주소</dt>
            <dd className="break-words">
              ({order.postal_code}) {order.address} {order.address_detail}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-ink-muted">
          마이페이지의 기본 배송지를 변경해도 이 주문의 배송지는 유지돼요.
        </p>
        <div className="mt-8 border-t border-line pt-6">
          <h2 className="text-xl font-bold">환불 신청</h2>
          {refund ? (
            <>
              <p className="mt-3 font-bold text-brand">
                {refundStatusLabels[refund.status] ?? "신청 상태 확인 필요"}
              </p>
              <Link
                className="btn btn-secondary mt-4"
                href={`/mypage/orders/${id}/refund`}
              >
                신청 내용 보기
              </Link>
            </>
          ) : order.status === "paid" ? (
            <Link
              className="btn btn-secondary mt-4"
              href={`/mypage/orders/${id}/refund`}
            >
              이 주문 환불 신청
            </Link>
          ) : (
            <p className="mt-3 text-ink-muted">
              결제 완료 주문만 환불을 신청할 수 있어요.
            </p>
          )}
        </div>
      </div>
    </AccountGuard>
  );
}

export default function OrderPage({ params }: { params: Params }) {
  return (
    <section className="container-page section">
      <AccountNav active="orders" />
      <h1 className="page-title mb-8">주문 상세</h1>
      <Suspense fallback={<p role="status">주문을 불러오고 있어요.</p>}>
        <OrderDetails params={params} />
      </Suspense>
      <Link href="/mypage/orders" className="btn btn-secondary mt-6">
        주문내역으로
      </Link>
    </section>
  );
}
