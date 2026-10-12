"use client";

// 헤더 오른쪽 아이콘: 찜 · 장바구니(담긴 개수) (v2 시안, 마켓컬리 기준)
// 개수는 C의 useNavigation 상태를 그대로 사용해요.

import Link from "next/link";
import { personalPages } from "@/lib/routes";
import { CartIcon, HeartIcon } from "./Icons";
import { useNavigation } from "./NavigationProvider";

const icon =
  "relative inline-flex size-11 items-center justify-center rounded-full hover:text-brand";

export function HeaderIcons() {
  const { state } = useNavigation();
  if (!personalPages.cart) return null;
  return (
    <div className="flex items-center">
      <Link href="/cart?tab=wishlist" className={icon} aria-label="찜한 상품">
        <HeartIcon width={26} height={26} />
      </Link>
      <Link
        href="/cart"
        className={icon}
        aria-label={
          state ? `장바구니 ${state.cartCount}개` : "장바구니, 수 확인 중"
        }
      >
        <CartIcon width={26} height={26} />
        {state && state.cartCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[0.6875rem] font-bold leading-5 text-white">
            {state.cartCount}
          </span>
        )}
      </Link>
    </div>
  );
}
