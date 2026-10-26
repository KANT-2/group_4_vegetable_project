"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { mergeGuestCart, type MergeResult } from "@/actions/cart";
import { useNavigation } from "@/components/common/NavigationProvider";

// 로그인 직후 비회원으로 담아 둔 상품을 계정 장바구니에 합쳐요. 한 번만 실행하고, 끝나면 화면을 새로 불러와요.
// pending: 아직 합치지 못한 비회원 장바구니 줄 수. 합친 뒤에도 안내를 보여 주려고 이 컴포넌트는 계속 화면에 둬요.
export function GuestCartMerge({ pending }: { pending: number }) {
  const router = useRouter();
  const { refresh } = useNavigation();
  const started = useRef(false); // 개발 모드의 이중 실행으로 같은 상품이 두 번 담기지 않게 해요.
  const [result, setResult] = useState<MergeResult | null>(null);

  useEffect(() => {
    if (pending === 0 || started.current) return;
    started.current = true;
    void mergeGuestCart()
      .then((merged) => {
        setResult(merged);
        void refresh();
        router.refresh();
      })
      .catch(() =>
        setResult({
          ok: false,
          error: "비회원 장바구니를 합치지 못했어요. 새로고침해 주세요.",
        }),
      );
  }, [pending, refresh, router]);

  if (result && !result.ok)
    return (
      <p
        role="alert"
        className="mb-4 rounded-control bg-danger-soft p-4 text-danger"
      >
        {result.error}
      </p>
    );
  if (result && result.skipped > 0)
    return (
      <p role="status" className="mb-4 rounded-control bg-accent-soft p-4">
        비회원으로 담아 둔 상품 {result.merged}개를 합쳤어요. 판매가 끝났거나
        담을 수 없는 상품 {result.skipped}개는 합치지 못했어요.
      </p>
    );
  if (result || pending === 0) return null; // 합칠 것이 없거나 모두 합쳤으면 안내 없음
  return (
    <p role="status" className="mb-4 rounded-control bg-brand-soft p-4">
      비회원으로 담아 둔 상품을 내 장바구니에 합치고 있어요.
    </p>
  );
}
