"use client";
import Link from "next/link";
import { useNavigation } from "@/components/common/NavigationProvider";
import { LeafIcon } from "@/components/common/Icons";

export function AccountWelcome() {
  const { state } = useNavigation();
  return (
    <div className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
          <LeafIcon width={24} height={24} />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-ink-muted">반가워요!</p>
          <p className="truncate font-bold">
            {state?.user ? `${state.user.nickname}님` : "나의 못난이마켓"}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 divide-x divide-line/60 border-t border-line/60 pt-4 text-center text-sm">
        <Link href="/cart?tab=coupons" className="text-brand-dark hover:underline">쿠폰함</Link>
        <Link href="/mypage/reviews" className="text-brand-dark hover:underline">작성할 리뷰</Link>
      </div>
      <p className="mt-4 hidden border-t border-line/60 pt-4 text-sm leading-relaxed text-ink-muted lg:block">
        모양은 달라도, 맛은 그대로.
        <br />
        오늘도 다정한 장보기를 함께해요.
      </p>
    </div>
  );
}
