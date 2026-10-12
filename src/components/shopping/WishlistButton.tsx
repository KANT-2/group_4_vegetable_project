"use client";

import { useState, useTransition } from "react";
import { setWishlist } from "@/actions/cart";
import { useLoginReturn } from "./useLoginReturn";

// 찜 버튼. 누르면 바로 바뀌고(낙관적 표시), 저장에 실패하면 원래대로 돌아가요.
export function WishlistButton({
  productId,
  productName,
  initialWished,
  compact = false,
}: {
  productId: string;
  productName: string;
  initialWished: boolean;
  compact?: boolean;
}) {
  const [wished, setWished] = useState(initialWished);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const goLogin = useLoginReturn();

  const toggle = () => {
    if (pending) return;
    const next = !wished;
    setWished(next);
    setError("");
    startTransition(async () => {
      try {
        const result = await setWishlist({
          product_id: productId,
          wished: next,
        });
        if (!result.ok) {
          setWished(!next);
          if (result.needsLogin) return goLogin();
          setError(result.error);
        }
      } catch {
        setWished(!next);
        setError("찜하지 못했어요. 연결 상태를 확인해 주세요.");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={wished}
        aria-label={`${productName} ${wished ? "찜 해제" : "찜하기"}`}
        className={
          compact
            ? "inline-flex size-12 items-center justify-center rounded-full border border-line bg-surface text-xl hover:bg-sand"
            : "btn btn-secondary gap-2"
        }
      >
        <span aria-hidden className={wished ? "text-accent" : "text-ink-muted"}>
          {wished ? "♥" : "♡"}
        </span>
        {!compact && (wished ? "찜했어요" : "찜하기")}
      </button>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
