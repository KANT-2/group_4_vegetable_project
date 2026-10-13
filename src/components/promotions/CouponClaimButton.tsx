"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { claimCoupon } from "@/actions/coupons";
import { useLoginReturn } from "@/components/shopping/useLoginReturn";

export function CouponClaimButton({ campaignId }: { campaignId: string }) {
  const [pending, startTransition] = useTransition();
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState("");
  const goLogin = useLoginReturn();
  return (
    <div className="mt-5">
      {claimed ? (
        <>
          <p role="status" className="text-sm font-semibold text-brand">
            내 쿠폰함에 저장했어요.
          </p>
          <Link href="/cart?tab=coupons" className="btn btn-primary mt-3">
            장바구니에서 내 쿠폰 보기
          </Link>
        </>
      ) : (
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary"
          onClick={() => {
            if (pending) return;
            setError("");
            startTransition(async () => {
              try {
                const result = await claimCoupon({ campaign_id: campaignId });
                if (result.ok) setClaimed(true);
                else if (result.needsLogin) goLogin();
                else setError(result.error);
              } catch {
                setError("쿠폰을 받지 못했어요. 다시 시도해 주세요.");
              }
            });
          }}
        >
          {pending ? "쿠폰 받는 중…" : "쿠폰 받기"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm leading-6 text-ink-muted">
          {error}
        </p>
      )}
    </div>
  );
}
