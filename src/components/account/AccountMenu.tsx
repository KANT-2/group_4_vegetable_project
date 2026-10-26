"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";
import { signOut } from "@/actions/auth";
import { useNavigation } from "@/components/common/NavigationProvider";

const groups = [
  { title: "나의 쇼핑", items: [
    { title: "주문·배송 조회", href: "/mypage/orders", icon: "M8 4h12v16H4V4h4m0-2h8v4H8zM8 10h8M8 14h8" },
    { title: "취소·환불 내역", href: "/mypage/orders?view=refunds", icon: "M4 8a8 8 0 1 1-1 7M4 3v5h5" },
    { title: "찜한 상품", href: "/cart?tab=wishlist", icon: "M12 20S2 14 2 7a5 5 0 0 1 10-1A5 5 0 0 1 22 7c0 7-10 13-10 13Z" },
    { title: "나의 리뷰", href: "/mypage/reviews", icon: "M4 17 3 21l4-1L20 7l-4-4ZM14 5l4 4" },
  ] },
  { title: "나의 혜택", items: [{ title: "쿠폰함", href: "/cart?tab=coupons", icon: "M3 4h18v5a3 3 0 0 0 0 6v5H3v-5a3 3 0 0 0 0-6Z" }] },
  { title: "계정 관리", items: [{ title: "회원 정보·배송지", href: "/mypage", icon: "M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 22v-3a8 8 0 0 1 16 0v3Z" }] },
];

export function AccountMenu({ onNavigate }: { onNavigate?: () => void }) {
  return <Suspense fallback={<p className="p-4 text-sm text-ink-muted">메뉴를 불러오고 있어요.</p>}><AccountMenuContent onNavigate={onNavigate} /></Suspense>;
}

function AccountMenuContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { clear } = useNavigation();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const current = pathname + (params.get("view") ? `?view=${params.get("view")}` : params.get("tab") ? `?tab=${params.get("tab")}` : "");
  return <nav aria-label="마이페이지 메뉴" className="px-3 pb-3">
    {groups.map((group) => <div key={group.title} className="border-t border-line/60 py-3">
      <p className="px-2 pb-1 text-xs text-ink-muted">{group.title}</p>
      {group.items.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={current === item.href ? "page" : undefined} className={`flex min-h-10 items-center gap-3 rounded-control px-2 py-2 text-sm ${current === item.href ? "bg-brand-soft font-bold text-brand-dark" : "hover:bg-sand"}`}>
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
        <span className="flex-1">{item.title}</span>
      </Link>)}
    </div>)}
    <div className="border-t border-line/60 pt-3"><button type="button" disabled={pending} className="flex min-h-10 w-full items-center gap-3 px-2 text-left text-sm text-ink-muted hover:text-brand" onClick={() => startTransition(async () => {
      setError(""); const result = await signOut(false);
      if (!result.ok) { setError(result.error); return; }
      clear(); onNavigate?.(); router.replace("/"); router.refresh();
    })}><span aria-hidden="true">↪</span>{pending ? "로그아웃 중…" : "로그아웃"}</button>{error && <p role="alert" className="text-xs text-danger">{error}</p>}</div>
  </nav>;
}
