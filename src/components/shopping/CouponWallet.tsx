import { AccountGuard } from "@/components/account/AccountGuard";
import { getCouponWallet } from "@/services/coupons";
import { CouponWalletView } from "./CouponWalletView";
export async function CouponWallet() {
  const wallet = await getCouponWallet();
  return (
    <AccountGuard userId={wallet.userId}>
      <CouponWalletView
        coupons={wallet.coupons}
        error={wallet.error}
        checkedAt={wallet.checkedAt}
      />
    </AccountGuard>
  );
}
