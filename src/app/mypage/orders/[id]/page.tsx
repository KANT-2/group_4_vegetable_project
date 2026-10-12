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
import { paymentMethods, type PaymentMethod } from "@/lib/payment";

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
        <p className="mt-3 text-sm text-ink-muted">
          모의 주문 기록입니다. 실제 결제나 배송은 진행되지 않아요.
        </p>
        {order.status === "payment_failed" && (
          <div className="mt-4">
            <p role="status">
              모의 결제가 실패했어요. 장바구니 상품은 유지됩니다.
            </p>
            <Link href="/cart" className="btn btn-primary mt-3">
              장바구니에서 다시 주문
            </Link>
          </div>
        )}
        <p className="mt-2 text-ink-muted">
          {formatOrderDate(order.created_at)}
        </p>
        <p className="mt-2 break-all text-sm text-ink-muted">
          주문번호 {order.id}
        </p>
        <h2 className="mb-4 mt-8 border-t border-line pt-6 text-xl font-bold">
          주문 상품
        </h2>
        <ul className="divide-y divide-line border-b border-line">
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
        <dl className="divide-y divide-line">
          <div className="flex justify-between gap-3 py-3 text-ink-muted">
            <dt>상품 금액</dt>
            <dd className="tabular-nums">
              {formatPrice(order.total_amount - order.shipping_fee)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 py-3 text-ink-muted">
            <dt>배송비</dt>
            <dd className="tabular-nums">{formatPrice(order.shipping_fee)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 py-4 text-xl font-bold">
            <dt>총 주문금액</dt>
            <dd className="tabular-nums">{formatPrice(order.total_amount)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 py-3 text-ink-muted">
            <dt>결제 수단</dt>
            <dd>
              {order.payment_method
                ? (paymentMethods[order.payment_method as PaymentMethod] ??
                  "확인 필요")
                : "기록 없음 (기존 주문)"}
            </dd>
          </div>
        </dl>
        <h2 className="mb-4 mt-6 border-t border-line pt-6 text-xl font-bold">
          주문 당시 배송지
        </h2>
        <dl className="divide-y divide-line border-y border-line">
          <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr]">
            <dt className="font-bold">받는 분</dt>
            <dd>{order.recipient_name}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr]">
            <dt className="font-bold">연락처</dt>
            <dd>{order.recipient_phone}</dd>
          </div>
          <div className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr]">
            <dt className="font-bold">주소</dt>
            <dd className="min-w-0 break-words">
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
