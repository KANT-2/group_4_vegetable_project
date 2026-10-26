"use client";

// 상품 카드 사진 아래의 [담기] 버튼 (A 담당, v2 시안)
// 수량 선택 없이 1개를 바로 담아요. 담기 자체는 C의 장바구니 기능(addToCart)을 그대로 사용해요.
// variant="icon": 상품 목록 카드 오른쪽 아래의 네모난 장바구니 버튼

import { useEffect, useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";
import { useNavigation } from "@/components/common/NavigationProvider";
import { useLoginReturn } from "@/components/shopping/useLoginReturn";
import { StockAlertDialog } from "@/components/shopping/StockAlertDialog";
import { BagIcon, CartIcon } from "./Icons";

export function QuickAddButton({
  productId,
  productName,
  variant = "full",
}: {
  productId: string;
  productName: string;
  variant?: "full" | "icon";
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [stockAlert, setStockAlert] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { refresh } = useNavigation();
  const goLogin = useLoginReturn();
  // 아이콘 버튼은 결과 문구를 잠깐만 말풍선으로 보여 줘요.
  useEffect(() => {
    if (variant !== "icon" || !message) return;
    const timer = window.setTimeout(() => setMessage(null), 2000);
    return () => window.clearTimeout(timer);
  }, [message, variant]);

  const submit = () => {
    if (pending) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await addToCart({ product_id: productId, quantity: 1 });
        if (!result.ok) {
          if (result.needsLogin) return goLogin();
          if (result.available !== undefined)
            return setStockAlert(result.error);
          setMessage(result.error);
          return;
        }
        setMessage("담았어요");
        void refresh(); // 헤더 장바구니 숫자 갱신
      } catch {
        setMessage("담지 못했어요");
      }
    });
  };

  const dialog = (
    <StockAlertDialog
      message={stockAlert}
      onClose={() => setStockAlert(null)}
    />
  );
  if (variant === "icon")
    return (
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={submit}
          aria-busy={pending}
          aria-label={`${productName} 장바구니에 담기`}
          disabled={pending}
          className="flex size-11 items-center justify-center rounded-[0.5rem] bg-brand text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          <BagIcon width={20} height={20} />
        </button>
        <p
          role="status"
          className={
            message
              ? "absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-control bg-ink px-2 py-1 text-xs text-white"
              : "sr-only"
          }
        >
          {message}
        </p>
        {dialog}
      </div>
    );

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={submit}
        aria-busy={pending}
        aria-label={`${productName} 장바구니에 담기`}
        className="flex min-h-10 w-full items-center justify-center gap-1 rounded-[0.25rem] border border-line bg-surface text-base text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-60"
        disabled={pending}
      >
        <CartIcon width={20} height={20} aria-hidden="true" />
        {pending ? "담는 중" : "담기"}
      </button>
      <p role="status" className="min-h-0 text-center text-xs text-brand-dark">
        {message}
      </p>
      {dialog}
    </div>
  );
}
