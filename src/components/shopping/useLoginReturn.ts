"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

// 로그인이 필요한 버튼을 눌렀을 때: 로그인 후 지금 보던 화면으로 돌아와요.
// (useSearchParams 대신 클릭 시점의 주소를 읽어 Suspense 경계가 필요 없어요.)
export function useLoginReturn() {
  const router = useRouter();
  return useCallback(() => {
    const next = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?next=${encodeURIComponent(next)}`);
  }, [router]);
}
