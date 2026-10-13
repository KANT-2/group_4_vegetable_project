import Link from "next/link";
import type { getCouponWallet } from "@/services/coupons";
type Props = Pick<
  Awaited<ReturnType<typeof getCouponWallet>>,
  "coupons" | "error" | "checkedAt"
>;
export function CouponWalletView({ coupons, error, checkedAt: now }: Props) {
  const date = (value: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(new Date(value).getTime() - 1));
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold">내 쿠폰</h2>
        <Link
          href="/promotions"
          className="text-sm font-semibold text-brand underline underline-offset-4"
        >
          받을 수 있는 혜택 보기
        </Link>
      </div>
      {error ? (
        <p role="alert" className="mt-5 text-sm">
          {error}
        </p>
      ) : coupons.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          아직 받은 쿠폰이 없어요. 혜택과 이야기에서 쿠폰을 받아보세요.
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {coupons.map((coupon) => {
            const expired = new Date(coupon.expires_at).getTime() <= now;
            const status = coupon.used_at
              ? "사용 완료"
              : expired
                ? "기간 만료"
                : "보유 중";
            return (
              <li
                key={coupon.id}
                className={`rounded-xl border border-dashed border-brand/30 bg-brand-soft p-5 ${expired || coupon.used_at ? "opacity-60" : ""}`}
              >
                <div className="flex justify-between gap-3">
                  <h3 className="font-bold">{coupon.campaign.name}</h3>
                  <span className="shrink-0 text-xs text-brand">{status}</span>
                </div>
                <p className="mt-3 text-3xl font-bold text-brand">
                  {coupon.campaign.discount_value.toLocaleString("ko-KR")}
                  {coupon.campaign.discount_type === "percent" ? "%" : "원"}
                </p>
                <p className="mt-3 text-sm">
                  {coupon.campaign.minimum_amount.toLocaleString("ko-KR")}원
                  이상 · 최대{" "}
                  {coupon.campaign.maximum_discount.toLocaleString("ko-KR")}원
                  할인
                </p>
                {coupon.campaign.eligible_vegetables.length > 0 && (
                  <p className="mt-1 text-xs text-ink-muted">
                    대상: 배추·무·양파
                  </p>
                )}
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  {date(coupon.expires_at)}까지
                </p>
                <Link
                  href={`/promotions/${coupon.campaign_id}`}
                  className="mt-3 inline-block text-sm font-semibold text-brand"
                >
                  사용 조건 확인 →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-xs leading-6 text-ink-muted">
        받은 쿠폰은 계정에 저장돼요. 결제 화면의 쿠폰 선택·할인 적용 기능은 준비
        중이에요.
      </p>
    </div>
  );
}
