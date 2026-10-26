"use client";

import { useState, useTransition } from "react";
import { setWishlist } from "@/actions/cart";
import { HeartIcon } from "@/components/common/Icons";
import { useLoginReturn } from "./useLoginReturn";
import { useNavigation } from "@/components/common/NavigationProvider";

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
  const [optimisticWished, setWished] = useState(initialWished);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { state, refresh } = useNavigation();
  const wished = pending
    ? optimisticWished
    : state && !state.user
      ? false
      : state?.wishlistIds
        ? state.wishlistIds.includes(productId)
        : optimisticWished;
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
          return;
        }
        await refresh();
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
        <HeartIcon
          width={24}
          height={24}
          fill={wished ? "currentColor" : "none"}
          className={wished ? "text-danger" : "text-ink-muted"}
        />
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
