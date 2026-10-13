import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { AccountGuard } from "@/components/account/AccountGuard";
import { CouponWallet } from "@/components/shopping/CouponWallet";
import { CartList } from "@/components/shopping/CartList";
import { WishlistList } from "@/components/shopping/WishlistList";
import { getCart, getWishlist } from "@/services/cart";

export const metadata: Metadata = { title: "장바구니·찜" };
type SearchParams = Promise<{ tab?: string | string[] }>;

async function CartContent() {
  const { userId, lines } = await getCart();
  // 서버 데이터가 바뀌면(새로고침) 목록 상태를 새로 시작해요.
  const key = lines.map((l) => `${l.productId}:${l.quantity}`).join(",");
  return (
    <AccountGuard userId={userId}>
      <CartList key={key} initialLines={lines} />
    </AccountGuard>
  );
}

async function WishlistContent() {
  const { userId, lines } = await getWishlist();
  const key = lines.map((l) => l.productId).join(",");
  return (
    <AccountGuard userId={userId}>
      <WishlistList key={key} initialLines={lines} />
    </AccountGuard>
  );
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const requested = (await searchParams).tab;
  const tab =
    requested === "wishlist"
      ? "wishlist"
      : requested === "coupons"
        ? "coupons"
        : "cart";
  const tabClass = (active: boolean) =>
    active ? "btn btn-primary" : "btn btn-secondary";
  return (
    <section className="container-page section">
      <h1 className="page-title">
        {tab === "cart"
          ? "장바구니"
          : tab === "coupons"
            ? "내 쿠폰"
            : "찜한 상품"}
      </h1>
      <nav
        aria-label="장바구니·찜 메뉴"
        className="mb-6 mt-4 flex flex-wrap gap-3"
      >
        <Link
          href="/cart"
          className={tabClass(tab === "cart")}
          aria-current={tab === "cart" ? "page" : undefined}
        >
          장바구니
        </Link>
        <Link
          href="/cart?tab=wishlist"
          className={tabClass(tab === "wishlist")}
          aria-current={tab === "wishlist" ? "page" : undefined}
        >
          찜
        </Link>
        <Link
          href="/cart?tab=coupons"
          className={tabClass(tab === "coupons")}
          aria-current={tab === "coupons" ? "page" : undefined}
        >
          내 쿠폰
        </Link>
      </nav>
      <Suspense
        key={tab}
        fallback={<p role="status">목록을 불러오고 있어요.</p>}
      >
        {tab === "cart" ? (
          <CartContent />
        ) : tab === "coupons" ? (
          <CouponWallet />
        ) : (
          <WishlistContent />
        )}
      </Suspense>
    </section>
  );
}
