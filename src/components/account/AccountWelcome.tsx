"use client";
import Link from "next/link";
import { useNavigation } from "@/components/common/NavigationProvider";
import { LeafIcon, ArrowRightIcon } from "@/components/common/Icons";

export function AccountWelcome() {
  const { state } = useNavigation();
  return (
    <div className="mb-4 rounded-xl border border-line/60 bg-surface p-5">
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
      <p className="mt-4 hidden border-t border-line/60 pt-4 text-sm leading-relaxed text-ink-muted lg:block">
        모양은 달라도, 맛은 그대로.
        <br />
        오늘도 다정한 장보기를 함께해요.
      </p>
      <Link
        href="/products"
        className="mt-4 hidden min-h-11 items-center justify-between rounded-control bg-brand-soft px-3 text-sm font-semibold text-brand-dark lg:flex"
      >
        제철 농산물 만나보기 <ArrowRightIcon width={16} height={16} />
      </Link>
    </div>
  );
}
