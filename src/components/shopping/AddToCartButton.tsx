"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";
import { useNavigation } from "@/components/common/NavigationProvider";
import { formatPrice } from "@/lib/format";
import { QuantityStepper } from "./QuantityStepper";
import { useLoginReturn } from "./useLoginReturn";

// 상품 상세·목록 어디서나 쓰는 장바구니 담기 버튼.
// layout="bar": 모바일 하단 고정 바처럼 한 줄로 배치해요.
export function AddToCartButton({
  productId,
  productName,
  price,
  layout = "stack",
  stock,
}: {
  productId: string;
  productName: string;
  price: number;
  layout?: "stack" | "bar";
  stock?: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const { refresh } = useNavigation();
  const goLogin = useLoginReturn();

  const submit = () => {
    if (stock === 0) return;
    if (pending) return; // 중복 클릭 방지
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await addToCart({ product_id: productId, quantity });
        if (!result.ok) {
          if (result.needsLogin) return goLogin();
          setMessage({ kind: "error", text: result.error });
          return;
        }
        setMessage({
          kind: "ok",
          text: `장바구니에 담았어요. (지금 ${result.quantity ?? quantity}개)`,
        });
        setQuantity(1);
        void refresh(); // 헤더 장바구니 숫자 갱신
      } catch {
        setMessage({
          kind: "error",
          text: "담지 못했어요. 연결 상태를 확인해 주세요.",
        });
      }
    });
  };

  const bar = layout === "bar";
  if (stock === 0) return <div className="space-y-2"><button disabled className="btn w-full border border-line bg-sand text-ink-muted">품절</button><p className="text-sm text-ink-muted">현재 재고가 없어 구매할 수 없습니다.</p></div>;
  return (
    <div className={bar ? "space-y-2" : "space-y-3"}>
      <div className={`flex items-center ${bar ? "gap-2" : "flex-wrap gap-3"}`}>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          disabled={pending}
          label={productName}
          compact={bar}
        />
        <button
          type="button"
          className={`btn btn-primary whitespace-nowrap ${bar ? "min-w-0 flex-1 px-3" : "flex-1 sm:flex-none sm:min-w-48"}`}
          disabled={pending}
          aria-busy={pending}
          onClick={submit}
        >
          {pending
            ? "담는 중…"
            : bar
              ? `${formatPrice(price * quantity)} 담기`
              : `장바구니 담기 · ${formatPrice(price * quantity)}`}
        </button>
      </div>
      <p
        role={message?.kind === "error" ? "alert" : "status"}
        className={
          message?.kind === "error"
            ? "field-error"
            : "text-sm font-semibold text-brand-dark"
        }
      >
        {message?.text}
        {message?.kind === "ok" && (
          <Link href="/cart" className="ml-2 underline underline-offset-4">
            장바구니 보기
          </Link>
        )}
      </p>
    </div>
  );
}
