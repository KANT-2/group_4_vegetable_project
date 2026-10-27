"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mockCheckout } from "@/actions/checkout";
import {
  type CartLine,
  summarizeCart,
  FREE_SHIPPING_MINIMUM,
} from "@/lib/cart";
import { SafeImage } from "@/components/common/SafeImage";
import { formatPrice } from "@/lib/format";
import {
  checkoutShippingSchema,
  type ShippingAddress,
} from "@/schemas/shipping";
import { useNavigation } from "@/components/common/NavigationProvider";
import { paymentMethods, type PaymentMethod } from "@/lib/payment";

const fields = [
  ["recipient_name", "받는 분", "shipping name", 40],
  ["recipient_phone", "연락처", "shipping tel", 20],
  ["postal_code", "우편번호", "shipping postal-code", 5],
  ["address", "기본 주소", "shipping address-line1", 200],
  ["address_detail", "상세주소", "shipping address-line2", 100],
] as const;

export function CheckoutForm({
  userId,
  lines,
  initialAddress,
}: {
  userId: string;
  lines: CartLine[];
  initialAddress: ShippingAddress;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [request, setRequest] = useState<{
    key: string;
    shipping: ShippingAddress;
    paymentMethod: PaymentMethod;
  } | null>(null);
  const busy = useRef(false);
  const router = useRouter();
  const { refresh } = useNavigation();
  const summary = summarizeCart(lines);
  const canOrder = lines.length > 0 && summary.unavailable === 0;
  const hasInitialAddress = Boolean(
    initialAddress.recipient_name &&
      initialAddress.recipient_phone &&
      initialAddress.postal_code &&
      initialAddress.address,
  );

  function submit() {
    if (busy.current || !canOrder) return;
    const parsed = checkoutShippingSchema.safeParse(address);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    // 응답이 유실돼도 같은 내용과 키로 재전송해 중복 주문을 방지합니다.
    const attempt = request ?? {
      key: crypto.randomUUID(),
      shipping: parsed.data,
      paymentMethod,
    };
    setRequest(attempt);
    busy.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await mockCheckout({
          userId,
          requestKey: attempt.key,
          shipping: attempt.shipping,
          paymentMethod: attempt.paymentMethod,
          success: true,
          items: lines.map((l) => ({
            product_id: l.productId,
            quantity: l.quantity,
            unit_price: l.price,
          })),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        void refresh();
        router.push(`/mypage/orders/${result.orderId}`);
      } catch {
        setError("결과를 확인하지 못했어요. 같은 내용으로 다시 시도해 주세요.");
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <form
      noValidate
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
        <div className="min-w-0 space-y-9">
          <section aria-labelledby="checkout-items-title">
            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
              <h2 id="checkout-items-title" className="text-lg font-bold">
                주문 상품
              </h2>
              <span className="text-sm text-ink-muted">
                {summary.kinds}종 · {summary.quantity}개
              </span>
            </div>
            <ul className="divide-y divide-line/70">
              {lines.map((l) => (
                <li key={l.productId} className="flex items-center gap-4 py-5">
                  <SafeImage
                    src={l.imageUrl}
                    alt={l.name}
                    className="h-20 w-16 shrink-0 rounded-control object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{l.name}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {l.unit} · {l.quantity}개
                    </p>
                    {!l.available && (
                      <p className="mt-1 text-xs text-danger">판매 종료 상품</p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">
                    {formatPrice(l.price * l.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            {lines.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-muted">
                주문할 상품이 없어요.
              </p>
            )}
            <Link
              href="/cart"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand"
            >
              장바구니 수정하기 ›
            </Link>
          </section>
          <section aria-labelledby="checkout-shipping-title">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-4">
              <h2 id="checkout-shipping-title" className="text-lg font-bold">
                배송 정보
              </h2>
              <Link href="/mypage" className="text-xs font-semibold text-brand">
                기본 배송지 관리 ›
              </Link>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-muted">
              {hasInitialAddress
                ? "저장한 기본 배송지를 불러왔어요. 변경한 주소는 이번 주문에만 적용돼요."
                : "저장한 기본 배송지가 없어요. 이번 주문에 사용할 배송 정보를 입력해 주세요."}
            </p>
            <div className="mt-6 space-y-4">
              {fields.map(([name, label, complete, max]) => (
                <div
                  key={name}
                  className="grid items-start gap-2 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4"
                >
                  <label
                    htmlFor={`checkout-${name}`}
                    className="text-sm font-semibold sm:pt-3"
                  >
                    {label}
                    {name === "address_detail" && (
                      <span className="ml-1 text-xs font-normal text-ink-muted">
                        (선택)
                      </span>
                    )}
                  </label>
                  <input
                    id={`checkout-${name}`}
                    className={`field ${name === "postal_code" ? "max-w-40" : ""}`}
                    name={name}
                    value={address[name]}
                    maxLength={max}
                    autoComplete={complete}
                    type={name === "recipient_phone" ? "tel" : "text"}
                    inputMode={
                      name === "postal_code"
                        ? "numeric"
                        : name === "recipient_phone"
                          ? "tel"
                          : "text"
                    }
                    required={name !== "address_detail"}
                    disabled={pending || !!request}
                    onChange={(e) => {
                      setAddress({ ...address, [name]: e.target.value });
                      setError("");
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
          <fieldset disabled={pending || !!request} className="min-w-0">
            <legend className="mb-5 w-full border-b-2 border-ink pb-4 text-lg font-bold">
              결제 수단
            </legend>
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-3">
              {Object.entries(paymentMethods).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-control border px-3 py-4 text-sm ${paymentMethod === value ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface"}`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={value}
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value as PaymentMethod)}
                    className="size-4 shrink-0 accent-brand"
                  />
                  <span className="font-semibold">{label}</span>
                </label>
              ))}
            </div>
            <p
              id="checkout-mock-notice"
              className="mt-4 text-xs leading-relaxed text-ink-muted"
            >
              모의 결제입니다. 실제 금액은 청구되지 않으며 카드·계좌 정보를
              입력하지 않아요.
            </p>
          </fieldset>
        </div>
        <aside
          aria-labelledby="checkout-total-title"
          className="min-w-0 lg:sticky lg:top-6"
        >
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <h2
              id="checkout-total-title"
              className="border-b border-line bg-sand px-5 py-4 text-lg font-bold"
            >
              결제 금액
            </h2>
            <dl className="space-y-4 p-5 text-sm">
              <div className="flex justify-between gap-3">
                <dt>상품 금액</dt>
                <dd className="tabular-nums">
                  {formatPrice(summary.originalTotal)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>상품 할인</dt>
                <dd className="tabular-nums text-accent">
                  {summary.discount > 0 ? "−" : ""}
                  {formatPrice(summary.discount)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>배송비</dt>
                <dd className="tabular-nums">
                  {summary.shippingFee === 0
                    ? "무료"
                    : formatPrice(summary.shippingFee)}
                </dd>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-line pt-5">
                <dt className="font-bold">최종 결제 금액</dt>
                <dd className="text-2xl font-bold tabular-nums text-brand-dark">
                  {formatPrice(summary.orderTotal)}
                </dd>
              </div>
            </dl>
            <div className="border-t border-line bg-brand-soft/60 px-5 py-4 text-xs leading-relaxed text-brand-dark">
              {summary.shippingFee > 0
                ? `${formatPrice(FREE_SHIPPING_MINIMUM - summary.total)} 더 담으면 무료배송이에요.`
                : "배송비 없이 가볍게 받아보세요."}
              <p className="mt-1 text-ink-muted">
                상품 금액 20,000원 이상 무료배송
              </p>
            </div>
          </div>
          {!canOrder && (
            <p
              role="alert"
              className="mt-4 rounded-control bg-danger-soft p-3 text-sm text-danger"
            >
              장바구니가 비어 있거나 판매 종료 상품이 있어요. 장바구니에서
              확인해 주세요.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-control bg-danger-soft p-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || !canOrder}
            aria-describedby="checkout-mock-notice"
            className="btn btn-primary mt-5 min-h-14 w-full text-base"
          >
            {pending
              ? "처리 중…"
              : `${formatPrice(summary.orderTotal)} 주문하기`}
          </button>
          {request && error && (
            <p className="mt-3 text-xs text-ink-muted">
              같은 버튼으로 재시도할 수 있어요. 내용을 바꾸려면 장바구니에서
              주문을 다시 시작해 주세요.
            </p>
          )}
          <p className="mt-3 text-center text-xs text-ink-muted">
            입력한 배송 정보와 주문 상품을 확인해 주세요.
          </p>
        </aside>
      </div>
    </form>
  );
}
