"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const VISITED_KEY = "motnani:in-app";

// 이 탭에서 사이트 안 화면을 보다가 왔는지 확인해요.
function cameFromThisSite() {
  // Chrome·Edge: 바로 전 기록의 주소를 직접 확인
  const nav = (window as Window & { navigation?: NavigationLike }).navigation;
  const current = nav?.currentEntry;
  if (nav && current && typeof current.index === "number") {
    const previous = nav.entries()[current.index - 1];
    if (!previous?.url) return false;
    return new URL(previous.url).origin === window.location.origin;
  }
  // 그 밖의 브라우저: 뒤로 갈 기록이 있고, 이 탭에서 사이트를 본 적이 있으면
  if (window.history.length < 2) return false;
  try {
    return sessionStorage.getItem(VISITED_KEY) === "1";
  } catch {
    return false;
  }
}

type NavigationLike = {
  currentEntry: { index: number } | null;
  entries: () => { url: string | null }[];
};

// 이 화면을 봤다고 표시만 하는 빈 컴포넌트 (상품 목록 등에 둬요)
export function VisitMark() {
  useEffect(() => {
    try {
      sessionStorage.setItem(VISITED_KEY, "1");
    } catch {
      // 저장이 막혀도 돌아가기는 상품 목록으로 동작해요
    }
  }, []);
  return null;
}

// "← 돌아가기": 사이트 안에서 왔으면 보던 화면(필터·스크롤 그대로)으로,
// 주소를 바로 열었으면 fallbackHref로 가요.
export default function BackLink({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  return (
    <>
      <VisitMark />
      <Link
        href={fallbackHref}
        onClick={(event) => {
          // 새 탭·새 창으로 열기는 그대로 둬요
          if (event.metaKey || event.ctrlKey || event.shiftKey) return;
          if (event.button !== 0 || !cameFromThisSite()) return;
          event.preventDefault();
          router.back();
        }}
        className="inline-flex h-12 items-center text-sm text-ink-muted hover:text-ink"
      >
        ← 돌아가기
      </Link>
    </>
  );
}
