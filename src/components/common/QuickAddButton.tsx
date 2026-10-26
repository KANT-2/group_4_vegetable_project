"use client";

// 상품 카드 사진 아래의 [담기] 버튼 (A 담당, v2 시안)
// 수량 선택 없이 1개를 바로 담아요. 담기 자체는 C의 장바구니 기능(addToCart)을 그대로 사용해요.

import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";
import { useNavigation } from "@/components/common/NavigationProvider";
import { useLoginReturn } from "@/components/shopping/useLoginReturn";
import { StockAlertDialog } from "@/components/shopping/StockAlertDialog";
import { CartIcon } from "./Icons";

export function QuickAddButton({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [stockAlert, setStockAlert] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { refresh } = useNavigation();
  const goLogin = useLoginReturn();

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
      <StockAlertDialog
        message={stockAlert}
        onClose={() => setStockAlert(null)}
      />
    </div>
  );
}
