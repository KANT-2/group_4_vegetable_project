import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getOrders } from "@/services/orders";
import { formatPrice } from "@/lib/format";
import {
  formatOrderDate,
  orderStatusLabels,
  refundStatusLabels,
} from "@/lib/orders";
import { AccountGuard } from "@/components/account/AccountGuard";
import { AccountLayout } from "@/components/account/AccountLayout";

export const metadata: Metadata = { title: "주문내역" };
type SearchParams = Promise<{ page?: string | string[] }>;

async function OrderList({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).page;
  const requested = Number(typeof raw === "string" ? raw : 1);
  const page =
    Number.isSafeInteger(requested) && requested > 0 && requested <= 10000
      ? requested
      : 1;
  const result = await getOrders(page);
  return (
    <AccountGuard userId={result.userId}>
      {!result.orders.length ? (
        <div className="rounded-xl border border-line/60 bg-surface p-6 sm:p-7">
          <h2 className="text-xl font-bold">
            {page === 1
              ? "아직 주문내역이 없어요"
              : "이 페이지에 주문이 없어요"}
          </h2>
          <p className="mt-3 text-ink-muted">
            주문이 생성되면 여기에서 상품과 배송 정보를 확인할 수 있어요.
          </p>
          <Link
            href={page === 1 ? "/products" : "/mypage/orders"}
            className="btn btn-primary mt-6"
          >
            {page === 1 ? "상품 둘러보기" : "첫 페이지로"}
          </Link>
        </div>
      ) : (
        <ul className="space-y-4">
          {result.orders.map((order) => (
            <li
              key={order.id}
              className="rounded-xl border border-line/60 bg-surface p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <time dateTime={order.created_at} className="text-ink-muted">
                  {formatOrderDate(order.created_at)}
                </time>
                <span className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-brand-soft px-3 py-1 font-bold text-brand-dark">
                    {orderStatusLabels[order.status] ?? "상태 확인 필요"}
                  </span>
                  {order.refund_requests && (
                    <span className="rounded-full bg-accent-soft px-3 py-1 font-bold text-accent">
                      {refundStatusLabels[order.refund_requests.status] ??
                        "환불 상태 확인 필요"}
                    </span>
                  )}
                </span>
              </div>
              <h2 className="mt-4 text-lg font-bold">
                {order.order_items[0]?.product_name ?? "주문 상품"}
                {order.order_items.length > 1 &&
                  ` 외 ${order.order_items.length - 1}종`}
              </h2>
              <p className="mt-2 font-bold">
                {formatPrice(order.total_amount)}
              </p>
              <p className="mt-2 break-all text-sm text-ink-muted">
                주문번호 {order.id}
              </p>
              <Link
                href={`/mypage/orders/${order.id}`}
                className="btn btn-secondary mt-4"
              >
                주문 상세·환불 신청
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || result.count > page * result.pageSize) && (
        <nav
          aria-label="주문내역 페이지"
          className="mt-6 flex items-center gap-4"
        >
          {page > 1 && (
            <Link
              className="btn btn-secondary"
              href={`/mypage/orders?page=${page - 1}`}
            >
              이전
            </Link>
          )}
          <span>{page}페이지</span>
          {result.count > page * result.pageSize && (
            <Link
              className="btn btn-secondary"
              href={`/mypage/orders?page=${page + 1}`}
            >
              다음
            </Link>
          )}
        </nav>
      )}
    </AccountGuard>
  );
}

export default function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <AccountLayout
      active="orders"
      title="주문내역"
      description="내 주문과 배송 정보, 환불 신청 상태를 한눈에 확인하세요."
    >
      <p className="mb-5 text-xs text-ink-muted">
        모의 결제 주문이며 실제 금액은 청구되지 않아요.
      </p>
      <Suspense fallback={<p role="status">주문내역을 불러오고 있어요.</p>}>
        <OrderList searchParams={searchParams} />
      </Suspense>
    </AccountLayout>
  );
}
