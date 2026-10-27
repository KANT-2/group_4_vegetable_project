// 내 쿠폰 탭 (2026-10-27)
// 쿠폰함은 필수 구현 범위가 아니라 다음 단계로 미뤘어요.
// 지금은 DB 조회 없이 "준비 중" 안내만 보여 줘요. 실제 쿠폰 목록 화면은
// CouponWalletView · services/coupons.ts 에 그대로 남겨 두었어요.
import Link from "next/link";
import { TicketIcon } from "@/components/common/Icons";

export function CouponWallet() {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center md:py-16">
      <div className="flex size-24 items-center justify-center rounded-full bg-brand-soft text-brand md:size-28">
        <TicketIcon width={48} height={48} />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold md:text-3xl">
        쿠폰함은 준비 중입니다
      </h2>
      <p className="mt-3 text-ink-muted">더 좋은 혜택으로 곧 찾아올게요.</p>
      <Link href="/products" className="btn btn-primary mt-8">
        쇼핑 계속하기
      </Link>
    </div>
  );
}
