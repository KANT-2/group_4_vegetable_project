import { Suspense } from "react";
import { getCart } from "@/services/cart";
import { getProfile } from "@/services/profile";
import { AccountGuard } from "@/components/account/AccountGuard";
import { CheckoutForm } from "@/components/shopping/CheckoutForm";

export const metadata = { title: "결제" };

async function CheckoutContent() {
  const [{ userId, lines }, profile] = await Promise.all([
    getCart(),
    getProfile(),
  ]);
  if (profile.id !== userId)
    throw new Error("로그인 계정이 변경됐어요. 새로고침해 주세요.");
  return (
    <AccountGuard userId={userId}>
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
    </AccountGuard>
  );
}

export default function CheckoutPage() {
  return (
    <section className="container-page section">
      <h1 className="page-title mb-6">결제</h1>
      <Suspense fallback={<p role="status">주문 정보를 불러오고 있어요.</p>}>
        <CheckoutContent />
      </Suspense>
    </section>
  );
}
