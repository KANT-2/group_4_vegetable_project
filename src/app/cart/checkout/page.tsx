import { Suspense } from "react";
import { getCart } from "@/services/cart";
import { getProfile } from "@/services/profile";
import { AccountGuard } from "@/components/account/AccountGuard";
import { CheckoutForm } from "@/components/shopping/CheckoutForm";
import { GuestCartMerge } from "@/components/shopping/GuestCartMerge";

export const metadata = { title: "결제" };

async function CheckoutContent() {
  const [{ userId, lines, guestPending }, profile] = await Promise.all([
    getCart(),
    getProfile(),
  ]);
  if (profile.id !== userId)
    throw new Error("로그인 계정이 변경됐어요. 새로고침해 주세요.");
  // 합칠 비회원 장바구니가 있으면(guestPending > 0) 먼저 합치고, 값이 없으면 합칠 것이 없는 것으로 봐요.
  const merging = guestPending > 0;
  return (
    <AccountGuard userId={userId}>
      {/* 로그인 직후 합칠 비회원 장바구니가 남아 있으면 먼저 합치고, 합친 뒤에 결제 화면을 보여 줘요. */}
      <GuestCartMerge pending={merging ? guestPending : 0} />
      {!merging && (
        <CheckoutForm
          userId={userId}
          lines={lines}
          initialAddress={{
            recipient_name: profile.recipient_name ?? "",
            recipient_phone: profile.recipient_phone ?? "",
            postal_code: profile.postal_code ?? "",
            address: profile.address ?? "",
            address_detail: profile.address_detail ?? "",
          }}
        />
      )}
    </AccountGuard>
  );
}

export default function CheckoutPage() {
  return (
    <section className="container-page py-8 md:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-5">
        <h1 className="text-2xl font-bold md:text-3xl">주문 / 결제</h1>
        <ol
          aria-label="주문 진행 단계"
          className="flex items-center gap-3 text-xs sm:text-sm"
        >
          <li className="text-ink-muted">01 장바구니</li>
          <li aria-hidden="true" className="text-ink-muted">
            ›
          </li>
          <li aria-current="step" className="font-bold text-brand">
            02 주문 / 결제
          </li>
          <li aria-hidden="true" className="text-ink-muted">
            ›
          </li>
          <li className="text-ink-muted">03 주문 완료</li>
        </ol>
      </header>
      <Suspense fallback={<p role="status">주문 정보를 불러오고 있어요.</p>}>
        <CheckoutContent />
      </Suspense>
    </section>
  );
}
