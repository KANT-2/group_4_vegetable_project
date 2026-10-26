import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getOrders } from "@/services/orders";
import { formatPrice } from "@/lib/format";
import { formatOrderDate, orderStatusLabels, refundStatusLabels } from "@/lib/orders";
import { paymentMethods, type PaymentMethod } from "@/lib/payment";
import { AccountGuard } from "@/components/account/AccountGuard";
import { OrderDetailsPopup } from "@/components/orders/OrderDetailsPopup";
import { OrderReviewButton } from "@/components/orders/OrderReviewButton";
import { DemoRefundButton } from "@/components/orders/DemoRefundButton";
import { AccountLayout } from "@/components/account/AccountLayout";

export const metadata: Metadata = { title: "주문내역" };
type SearchParams = Promise<{ page?: string | string[]; view?: string }>;

async function OrderList({ searchParams }: { searchParams: SearchParams }) {
  const { page: raw, view } = await searchParams;
  const refundsOnly = view === "refunds";
  const requested = Number(typeof raw === "string" ? raw : 1);
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 10000 ? requested : 1;
  const result = await getOrders(page, refundsOnly);
  const pageUrl = (number: number) => `/mypage/orders?page=${number}${refundsOnly ? "&view=refunds" : ""}`;
  const totalPages = Math.max(1, Math.ceil(result.count / result.pageSize));
  if (page > totalPages) redirect(pageUrl(totalPages));
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => start + index);
  return (
    <AccountGuard userId={result.userId}>
      <p className="mb-5 text-sm text-ink-muted">전체 <strong className="text-ink">{result.count}개</strong> · 최신 주문순</p>
      {!result.orders.length ? (
        <div className="rounded-xl border border-line/60 bg-surface px-6 py-20 text-center">
          <p className="text-ink-muted">{refundsOnly ? "취소·환불 내역이 없습니다." : "주문내역이 없습니다."}</p>
          <Link href="/products" className="btn btn-secondary mt-6">상품 둘러보기</Link>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-line/60 bg-surface divide-y divide-line/60">
          {result.orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-3 px-5 py-5 transition-colors hover:bg-sand/50 sm:px-7">
              <OrderDetailsPopup summary={<>
                  <time dateTime={order.created_at} className="text-xs text-ink-muted sm:text-sm">{formatOrderDate(order.created_at)}</time>
                  <span className="col-start-1 row-start-2 min-w-0 xl:col-auto xl:row-auto">
                    <span className="block truncate font-semibold">{order.order_items[0]?.product_name ?? "주문 상품"}{order.order_items.length > 1 ? ` 외 ${order.order_items.length - 1}종` : ""}</span>
                    <span className="mt-1 block text-xs text-ink-muted">총 {order.order_items.reduce((sum, item) => sum + item.quantity, 0)}개</span>
                  </span>
                  <strong className="col-start-2 row-start-2 whitespace-nowrap text-sm xl:col-auto xl:row-auto">{formatPrice(order.total_amount)}</strong>
                  <span className="col-start-2 row-start-1 whitespace-nowrap rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-dark xl:col-auto xl:row-auto">{order.refund_requests ? refundStatusLabels[order.refund_requests.status] ?? "환불 상태 확인 필요" : orderStatusLabels[order.status] ?? "상태 확인 필요"}</span>
                  <span className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1 rounded-control border border-line bg-white px-3 text-sm font-semibold text-ink xl:col-span-1">
                    <span>상세 보기</span>
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m9 6 6 6-6 6" /></svg>
                  </span>
                </>}>
              <div className="border-t border-line/60 bg-sand/40 p-5 sm:p-7">
                <p className="mb-2 text-sm text-ink-muted">주문 일시 {formatOrderDate(order.created_at)}</p>
                <p className="mb-5 break-all text-xs text-ink-muted">주문번호 {order.id} · {order.refund_requests ? refundStatusLabels[order.refund_requests.status] : orderStatusLabels[order.status]}</p>
                <h2 className="mb-4 font-bold">주문 상품 {order.order_items.reduce((sum, item) => sum + item.quantity, 0)}개</h2>
                <ul className="divide-y divide-line/60">
                  {order.order_items.map((item) => (
                    <li key={item.product_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div><p className="font-semibold">{item.product_name}</p><p className="mt-1 text-sm text-ink-muted">{item.product_unit} · {formatPrice(item.unit_price)} × {item.quantity}개</p></div>
                      <strong>{formatPrice(item.unit_price * item.quantity)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 grid gap-6 border-t border-line/60 pt-5 text-sm xl:grid-cols-2">
                  <section>
                    <h3 className="mb-3 font-bold">배송지 정보</h3>
                    <p>{order.recipient_name} · {order.recipient_phone}</p>
                    <p className="mt-2 break-words text-ink-muted">({order.postal_code}) {order.address} {order.address_detail}</p>
                  </section>
                  <section>
                    <h3 className="mb-3 font-bold">결제 정보</h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between gap-3"><dt className="text-ink-muted">결제 수단</dt><dd>{paymentMethods[order.payment_method as PaymentMethod] ?? "미등록"} (모의 결제)</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-ink-muted">상품 금액</dt><dd>{formatPrice(order.order_items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0))}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="text-ink-muted">배송비</dt><dd>{formatPrice(order.shipping_fee)}</dd></div>
                      {order.paid_at && <div className="flex flex-wrap justify-between gap-2"><dt className="text-ink-muted">결제 일시</dt><dd>{formatOrderDate(order.paid_at)}</dd></div>}
                      <div className="flex justify-between gap-3 border-t border-line/60 pt-3 font-bold"><dt>총 주문 금액</dt><dd className="text-lg text-brand">{formatPrice(order.total_amount)}</dd></div>
                    </dl>
                  </section>
                </div>
                {order.status === "paid" && !order.refund_requests && (result.userId === "customer-demo-qwer" ? <DemoRefundButton orderId={order.id} /> : <div className="mt-5 flex justify-end"><Link href={`/mypage/orders/${order.id}/refund`} className="btn btn-secondary">환불 신청</Link></div>)}
              </div>
              </OrderDetailsPopup>
              {!refundsOnly && order.status === "paid" && <OrderReviewButton userId={result.userId} orderId={order.id} items={order.order_items} />}
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <nav aria-label="주문내역 페이지" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && <Link className="btn btn-secondary" href={pageUrl(page - 1)}>이전</Link>}
          {start > 1 && <><Link className="btn btn-secondary" href={pageUrl(1)}>1</Link><span aria-hidden="true">…</span></>}
          {pages.map((number) => <Link key={number} aria-current={number === page ? "page" : undefined} className={`btn ${number === page ? "btn-primary" : "btn-secondary"}`} href={pageUrl(number)}>{number}</Link>)}
          {pages.at(-1)! < totalPages && <><span aria-hidden="true">…</span><Link className="btn btn-secondary" href={pageUrl(totalPages)}>{totalPages}</Link></>}
          {page < totalPages && <Link className="btn btn-secondary" href={pageUrl(page + 1)}>다음</Link>}
        </nav>
      )}
    </AccountGuard>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const refundsOnly = (await searchParams).view === "refunds";
  return (
    <AccountLayout active="orders" title={refundsOnly ? "취소·환불 내역" : "주문·배송 조회"} description={refundsOnly ? "취소한 주문과 환불 신청 내역을 확인하세요." : "지금까지 주문한 상품과 배송지, 결제 정보를 확인하세요."}>
      <Suspense fallback={<p role="status" className="text-ink-muted">주문내역을 불러오고 있어요.</p>}>
        <OrderList searchParams={searchParams} />
      </Suspense>
    </AccountLayout>
  );
}
