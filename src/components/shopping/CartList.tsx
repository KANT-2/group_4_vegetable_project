"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { removeFromCart, updateCartQuantity } from "@/actions/cart";
import { SafeImage } from "@/components/common/SafeImage";
import { useNavigation } from "@/components/common/NavigationProvider";
import { type CartLine, summarizeCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { QuantityStepper } from "./QuantityStepper";
import { useLoginReturn } from "./useLoginReturn";

export function CartList({ initialLines }: { initialLines: CartLine[] }) {
  const [lines, setLines] = useState(initialLines);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const { refresh } = useNavigation();
  const goLogin = useLoginReturn();
  const summary = summarizeCart(lines);

  const run = (
    productId: string,
    action: () => Promise<{
      ok: boolean;
      error?: string;
      needsLogin?: boolean;
    }>,
    apply: () => void,
  ) => {
    if (busy) return; // 한 번에 한 요청만
    setBusy(productId);
    setErrors((prev) => ({ ...prev, [productId]: "" }));
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) {
          if (result.needsLogin) return goLogin();
          setErrors((prev) => ({
            ...prev,
            [productId]: result.error ?? "저장하지 못했어요.",
          }));
          return;
        }
        apply();
        void refresh();
      } catch {
        setErrors((prev) => ({
          ...prev,
          [productId]: "저장하지 못했어요. 연결 상태를 확인해 주세요.",
        }));
      } finally {
        setBusy(null);
      }
    });
  };

  const changeQuantity = (line: CartLine, quantity: number) =>
    run(
      line.productId,
      () => updateCartQuantity({ product_id: line.productId, quantity }),
      () =>
        setLines((prev) =>
          prev.map((l) =>
            l.productId === line.productId ? { ...l, quantity } : l,
          ),
        ),
    );

  const remove = (line: CartLine) =>
    run(
      line.productId,
      () => removeFromCart({ product_id: line.productId }),
      () =>
        setLines((prev) => prev.filter((l) => l.productId !== line.productId)),
    );

  if (!lines.length)
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-bold">장바구니가 비어 있어요</h2>
        <p className="mt-3 text-ink-muted">
          모양은 달라도 맛은 그대로인 못난이 농산물을 담아 보세요.
        </p>
        <Link href="/products" className="btn btn-primary mt-6">
          상품 둘러보기
        </Link>
      </div>
    );

  return (
    <div className="grid gap-6 pb-28 lg:grid-cols-[1fr_20rem] lg:pb-0">
      <ul className="space-y-3" aria-label="장바구니 상품">
        {lines.map((line) => {
          const rowBusy = busy === line.productId;
          return (
            <li
              key={line.productId}
              className="card flex gap-4 p-4"
              aria-busy={rowBusy}
            >
              <div className="size-20 shrink-0 overflow-hidden rounded-control bg-sand sm:size-24">
                <SafeImage
                  src={line.imageUrl}
                  alt={line.name}
                  className="h-full w-full object-cover"
                  placeholderText="사진 없음"
                />
              </div>
              <div className="min-w-0 flex-1">
                {line.available ? (
                  <Link
                    href={`/products/${line.productId}`}
                    className="font-bold hover:underline"
                  >
                    {line.name}
                  </Link>
                ) : (
                  <p className="font-bold text-ink-muted">{line.name}</p>
                )}
                {line.available ? (
                  <p className="text-sm text-ink-muted">
                    {line.unit} · 개당 {formatPrice(line.price)}
                  </p>
                ) : (
                  <p className="text-sm text-danger">
                    지금은 구매할 수 없어 합계에서 빠졌어요.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {line.available && (
                    <QuantityStepper
                      value={line.quantity}
                      onChange={(q) => changeQuantity(line, q)}
                      disabled={!!busy}
                      label={line.name}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    {line.available && (
                      <p className="font-bold tabular-nums">
                        {formatPrice(line.price * line.quantity)}
                      </p>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={!!busy}
                      onClick={() => remove(line)}
                      aria-label={`${line.name} 삭제`}
                    >
                      {rowBusy ? "처리 중…" : "삭제"}
                    </button>
                  </div>
                </div>
                {errors[line.productId] && (
                  <p role="alert" className="field-error">
                    {errors[line.productId]}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* 합계: 넓은 화면은 오른쪽 카드, 모바일은 하단 고정 바 */}
      <aside aria-label="결제 예정 금액" className="hidden lg:block">
        <div className="card sticky top-4 space-y-3 p-5">
          <SummaryRows summary={summary} />
          <OrderButton />
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            {summary.kinds}종 {summary.quantity}개
            <span className="block text-lg font-bold text-ink tabular-nums">
              {formatPrice(summary.total)}
            </span>
          </p>
          <OrderButton />
        </div>
      </div>
    </div>
  );
}

function SummaryRows({
  summary,
}: {
  summary: ReturnType<typeof summarizeCart>;
}) {
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-muted">상품 금액 (정가)</dt>
        <dd className="tabular-nums">{formatPrice(summary.originalTotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-muted">못난이 할인</dt>
        <dd className="tabular-nums text-accent">
          −{formatPrice(summary.discount)}
        </dd>
      </div>
      <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
        <dt>결제 예정 금액</dt>
        <dd className="tabular-nums">{formatPrice(summary.total)}</dd>
      </div>
      <p className="text-xs text-ink-muted">
        {summary.kinds}종 {summary.quantity}개 · 배송비는 주문 단계에서
        안내돼요.
        {summary.unavailable > 0 &&
          ` 구매할 수 없는 상품 ${summary.unavailable}종은 빠졌어요.`}
      </p>
    </dl>
  );
}

// 주문·모의 결제 화면이 생기면 연결합니다.
function OrderButton() {
  return (
    <button type="button" className="btn btn-primary" disabled>
      주문하기 (준비 중)
    </button>
  );
}
