import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  formatOrderDate,
  orderStatusLabels,
  refundStatusLabels,
} from "@/lib/orders";
import { paymentMethods, type PaymentMethod } from "@/lib/payment";
import { ArrowRightIcon, LeafIcon } from "@/components/common/Icons";

interface ReceiptOrder {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  shipping_fee: number;
  payment_method?: string | null;
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  address: string;
  address_detail?: string | null;
}
interface ReceiptItem {
  product_id: string;
  product_name: string;
  product_unit: string;
  quantity: number;
  unit_price: number;
}

export function OrderReceipt({
  order,
  items,
  refund,
  refundSupported = true,
}: {
  order: ReceiptOrder;
  items: ReceiptItem[];
  refund: { status: string } | null;
  // false 이면 환불 버튼 대신 안내를 보여 줘요. (동작하지 않는 버튼은 두지 않아요.)
  refundSupported?: boolean;
}) {
  const paid = order.status === "paid";
  const failed = order.status === "payment_failed";
  const cancelled = order.status === "cancelled";
  const title = paid
    ? "주문이 완료되었어요."
    : failed
      ? "결제를 완료하지 못했어요."
      : cancelled
        ? "주문이 취소되었어요."
        : "주문 내용을 확인해 주세요.";
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <div className="space-y-6">
      <section
        aria-labelledby="order-result-title"
        className={`overflow-hidden rounded-2xl border bg-surface ${failed ? "border-danger/30" : "border-line/60"}`}
      >
        <div
          className={`px-5 py-8 text-center sm:px-8 sm:py-10 ${failed ? "bg-danger-soft/40" : "bg-brand-soft/50"}`}
        >
          <span
            aria-hidden="true"
            className={`mx-auto mb-4 flex size-14 items-center justify-center rounded-full ${failed ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand"}`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {paid ? (
                <path d="m5 12 4 4L19 6" />
              ) : failed || cancelled ? (
                <path d="m7 7 10 10M17 7 7 17" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 7v5l3 2" />
                </>
              )}
            </svg>
          </span>
          <p
            className={`mb-2 text-xs font-bold ${failed ? "text-danger" : "text-brand"}`}
          >
            {orderStatusLabels[order.status] ?? "상태 확인 필요"}
          </p>
          <h2
            id="order-result-title"
            className="text-2xl font-bold leading-snug sm:text-3xl"
          >
            {title}
          </h2>
          <p className="mt-3 text-sm text-ink-muted">
            {paid
              ? "못난이마켓과 함께해 주셔서 고마워요."
              : failed
                ? "장바구니의 상품은 그대로 남아 있어요."
                : cancelled
                  ? "아래에서 주문 기록을 확인할 수 있어요."
                  : "현재 주문 상태와 상세 내역을 확인할 수 있어요."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 min-[380px]:flex-row">
            <Link
              href={failed ? "/cart" : "/products"}
              className="btn btn-primary min-h-12"
            >
              {failed ? "장바구니에서 다시 주문" : "계속 쇼핑하기"}
              <ArrowRightIcon width={16} height={16} />
            </Link>
            <Link href="/mypage/orders" className="btn btn-secondary min-h-12">
              주문내역 보기
            </Link>
          </div>
        </div>
        <dl className="grid gap-4 px-5 py-5 text-sm sm:grid-cols-2 sm:px-7">
          <div>
            <dt className="mb-1 text-xs text-ink-muted">주문번호</dt>
            <dd className="break-all font-medium tabular-nums">{order.id}</dd>
          </div>
          <div className="sm:text-right">
            <dt className="mb-1 text-xs text-ink-muted">주문 일시</dt>
            <dd>
              <time dateTime={order.created_at}>
                {formatOrderDate(order.created_at)}
              </time>
            </dd>
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-5">
          <section
            aria-labelledby="receipt-items-title"
            className="rounded-xl border border-line/60 bg-surface p-5 sm:p-7"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line pb-4">
              <h2 id="receipt-items-title" className="text-lg font-bold">
                주문 상품
              </h2>
              <span className="text-xs text-ink-muted">
                {items.length}종 · {quantity}개
              </span>
            </header>
            <ul className="divide-y divide-line/60">
              {items.map((item) => (
                <li
                  key={item.product_id}
                  className="flex items-start gap-3 py-5 last:pb-0"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-sand text-bark"
                  >
                    <LeafIcon width={20} height={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.product_name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                      {item.product_unit} · {item.quantity}개
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      개당 {formatPrice(item.unit_price)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">
                    {formatPrice(item.quantity * item.unit_price)}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="receipt-shipping-title"
            className="rounded-xl border border-line/60 bg-surface p-5 sm:p-7"
          >
            <h2
              id="receipt-shipping-title"
              className="mb-5 border-b border-line pb-4 text-lg font-bold"
            >
              배송 정보
            </h2>
            <dl className="space-y-4 text-sm">
              <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3">
                <dt className="text-ink-muted">받는 분</dt>
                <dd className="font-semibold">{order.recipient_name}</dd>
              </div>
              <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3">
                <dt className="text-ink-muted">연락처</dt>
                <dd className="tabular-nums">{order.recipient_phone}</dd>
              </div>
              <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3">
                <dt className="text-ink-muted">주소</dt>
                <dd className="min-w-0 break-words leading-relaxed">
                  <span className="mb-1 block text-xs text-ink-muted">
                    {order.postal_code}
                  </span>
                  {order.address}
                  {order.address_detail && (
                    <span className="block">{order.address_detail}</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-5 border-t border-line/60 pt-4 text-xs leading-relaxed text-ink-muted">
              주문 시 입력한 배송지예요. 기본 배송지를 변경해도 이 주문에는
              적용되지 않아요.
            </p>
          </section>
        </div>

        <aside className="min-w-0 space-y-5 xl:sticky xl:top-6">
          <section
            aria-labelledby="receipt-payment-title"
            className="overflow-hidden rounded-xl border border-line bg-surface"
          >
            <h2
              id="receipt-payment-title"
              className="border-b border-line bg-sand px-5 py-4 text-lg font-bold"
            >
              결제 정보
            </h2>
            <dl className="space-y-4 p-5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">상품 금액</dt>
                <dd className="tabular-nums">
                  {formatPrice(order.total_amount - order.shipping_fee)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">배송비</dt>
                <dd className="tabular-nums">
                  {formatPrice(order.shipping_fee)}
                </dd>
              </div>
              <div className="border-t border-line pt-4">
                <dt className="text-xs text-ink-muted">
                  {paid ? "총 결제 금액" : "총 주문 금액"}
                </dt>
                <dd className="mt-1 text-3xl font-bold tabular-nums text-brand-dark">
                  {formatPrice(order.total_amount)}
                </dd>
              </div>
              <div className="border-t border-line/60 pt-4">
                <dt className="mb-1 text-xs text-ink-muted">결제 수단</dt>
                <dd className="font-medium">
                  {order.payment_method
                    ? (paymentMethods[order.payment_method as PaymentMethod] ??
                      "확인 필요")
                    : "기록 없음 (기존 주문)"}
                </dd>
              </div>
            </dl>
          </section>
          <section
            aria-labelledby="receipt-refund-title"
            className="rounded-xl border border-line/60 bg-surface p-5"
          >
            <h2 id="receipt-refund-title" className="text-sm font-bold">
              주문 관리
            </h2>
            {!refundSupported ? (
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                이 주문의 환불·취소는 아직 지원하지 않아요.
              </p>
            ) : refund ? (
              <>
                <p className="mt-3 text-sm font-semibold text-brand">
                  {refundStatusLabels[refund.status] ?? "신청 상태 확인 필요"}
                </p>
                <Link
                  href={`/mypage/orders/${order.id}/refund`}
                  className="btn btn-secondary mt-4 w-full text-sm"
                >
                  신청 내용 보기
                </Link>
              </>
            ) : paid ? (
              <>
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  주문에 대한 환불 신청을 여기에서 진행할 수 있어요.
                </p>
                <Link
                  href={`/mypage/orders/${order.id}/refund`}
                  className="btn btn-secondary mt-4 w-full text-sm"
                >
                  환불 신청
                </Link>
              </>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                결제 완료 주문만 환불을 신청할 수 있어요.
              </p>
            )}
          </section>
        </aside>
      </div>
      <p className="text-center text-xs leading-relaxed text-ink-muted">
        교육용 주문 기록으로 실제 금액 청구와 배송은 진행되지 않아요.
      </p>
    </div>
  );
}
