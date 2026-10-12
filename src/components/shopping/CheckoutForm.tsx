"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mockCheckout } from "@/actions/checkout";
import { type CartLine, summarizeCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { shippingSchema, type ShippingAddress } from "@/schemas/shipping";
import { useNavigation } from "@/components/common/NavigationProvider";

const fields = [
  ["recipient_name", "받는 분", "shipping name", 40],
  ["recipient_phone", "연락처", "shipping tel", 20],
  ["postal_code", "우편번호", "shipping postal-code", 5],
  ["address", "기본 주소", "shipping address-line1", 200],
  ["address_detail", "상세주소 (선택)", "shipping address-line2", 100],
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
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [request, setRequest] = useState<{
    key: string;
    success: boolean;
    shipping: ShippingAddress;
  } | null>(null);
  const busy = useRef(false);
  const router = useRouter();
  const { refresh } = useNavigation();
  const summary = summarizeCart(lines);
  const canOrder = lines.length > 0 && summary.unavailable === 0;

  function submit(success: boolean) {
    if (busy.current || !canOrder) return;
    const parsed = shippingSchema.safeParse(address);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    // 응답이 유실돼도 같은 내용과 키로 재전송해 중복 주문을 방지합니다.
    const attempt = request ?? {
      key: crypto.randomUUID(),
      success,
      shipping: parsed.data,
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
          success: attempt.success,
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
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <section className="card p-6">
        <h2 className="text-xl font-bold">주문 상품</h2>
        <ul className="mt-4 divide-y divide-line">
          {lines.map((l) => (
            <li
              key={l.productId}
              className="flex flex-wrap justify-between gap-2 py-4"
            >
              <span>
                {l.name} · {l.quantity}개
              </span>
              <span>{formatPrice(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4">배송비 0원 (모의 주문)</p>
        <p className="mt-3 text-xl font-bold">
          합계 {formatPrice(summary.total)}
        </p>
        {!canOrder && (
          <p role="alert" className="field-error">
            장바구니가 비어 있거나 판매 종료 상품이 있어요. 장바구니에서 확인해
            주세요.
          </p>
        )}
        <Link href="/cart" className="btn btn-secondary mt-4">
          장바구니로 돌아가기
        </Link>
      </section>
      <form
        noValidate
        className="card p-6"
        aria-busy={pending}
        onSubmit={(e) => {
          e.preventDefault();
          submit(true);
        }}
      >
        <h2 className="text-xl font-bold">배송지</h2>
        <p className="mt-3 text-sm text-ink-muted">
          저장한 기본 배송지를 불러왔어요. 여기서 바꾼 주소는 이번 주문에만
          적용돼요.
        </p>
        <div className="mt-5 space-y-4">
          {fields.map(([name, label, complete, max]) => (
            <div key={name}>
              <label htmlFor={`checkout-${name}`} className="field-label">
                {label}
              </label>
              <input
                id={`checkout-${name}`}
                className="field"
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
                onChange={(e) =>
                  setAddress({ ...address, [name]: e.target.value })
                }
              />
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-ink-muted">
          실제 결제나 배송은 진행되지 않아요. 성공·실패를 선택해 동작을 확인할
          수 있어요.
        </p>
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="btn btn-primary"
            disabled={pending || !canOrder || request?.success === false}
            type="submit"
          >
            {pending ? "처리 중…" : "모의 결제 성공"}
          </button>
          <button
            className="btn btn-secondary"
            disabled={pending || !canOrder || request?.success === true}
            type="button"
            onClick={() => submit(false)}
          >
            모의 결제 실패
          </button>
        </div>
        {request && error && (
          <p className="mt-3 text-sm text-ink-muted">
            같은 버튼으로 재시도할 수 있어요. 내용을 바꾸려면 장바구니에서
            주문을 다시 시작해 주세요.
          </p>
        )}
      </form>
    </div>
  );
}
