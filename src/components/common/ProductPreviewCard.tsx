// 메인·레시피 상세에서 판매 상품을 간단히 보여주는 카드 (A 담당)
// v2 시안(마켓컬리 기준): 249×320 비율 사진 → [담기] → [농가] 상품명 → 정가(취소선) → 할인율·판매가 → 후기 수
// 상품 상세 페이지(B)가 아직 없으면 href 가 null 이고, 링크 없는 카드로만 보여줘요.
// productId로 상품별 사진을 고르고, showQuickAdd가 true이면 [담기] 버튼을 보여줘요.

import Link from "next/link";
import type { ReactNode } from "react";
import { UGLY_REASON_LABELS, type UglyReason } from "@/types/product";
import { getDiscountRate } from "@/lib/format";
import { QuickAddButton } from "./QuickAddButton";
import { ProductImageRotator } from "@/components/products/ProductImageRotator";
import { getProductImages } from "@/lib/product-gallery";
import { WishlistButton } from "@/components/shopping/WishlistButton";

interface ProductPreviewCardProps {
  name: string;
  imageUrl?: string;
  vegetableId?: string;
  unit: string;
  price: number;
  originalPrice: number;
  uglyReason: UglyReason;
  eyebrow?: string; // 이름 앞 [ ] 안에 보여줄 말 (예: 농가 이름)
  href: string | null;
  productId: string;
  showQuickAdd?: boolean;
  reviewCount?: number;
  description?: string; // 이름 아래 회색 한 줄 (예: 홍보 문구)
  priority?: boolean; // 첫 화면 사진은 먼저 불러와요
}

const won = (n: number) => n.toLocaleString("ko-KR");

export function ProductPreviewCard({
  name,
  imageUrl,
  vegetableId,
  unit,
  price,
  originalPrice,
  uglyReason,
  eyebrow,
  href,
  productId,
  showQuickAdd = true,
  reviewCount,
  description,
  priority = false,
}: ProductPreviewCardProps) {
  const discount = getDiscountRate(price, originalPrice);

  const wrap = (children: ReactNode, className: string) =>
    href ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );

  return (
    <div className="group">
      <div className="relative">
        {wrap(
          <div className="relative overflow-hidden rounded-[0.25rem] bg-sand">
            <ProductImageRotator
              images={getProductImages({
                id: productId,
                imageUrl,
                vegetableId,
              })}
              name={name}
              priority={priority}
              className="aspect-[249/320] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute left-2.5 top-2.5 rounded-[0.25rem] bg-brand px-2 py-0.5 text-sm font-medium text-white">
              {UGLY_REASON_LABELS[uglyReason]}
            </span>
          </div>,
          "block",
        )}
        {productId && (
          <div className="absolute right-2 bottom-2 z-10">
            <WishlistButton
              productId={productId}
              productName={name}
              initialWished={false}
              compact
            />
          </div>
        )}
      </div>
      {productId && showQuickAdd && (
        <QuickAddButton productId={productId} productName={name} />
      )}
      {wrap(
        <>
          <h3 className="line-clamp-2 text-base leading-[1.45] text-ink">
            {eyebrow && `[${eyebrow}] `}
            {name}
          </h3>
          {description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-ink-muted">
              {description}
            </p>
          )}
          <p className="sr-only">{unit}</p>
          {discount > 0 && (
            <p className="mt-1.5 text-sm leading-tight text-ink-muted">
              <span className="sr-only">정가 </span>
              <del>{won(originalPrice)}원</del>
            </p>
          )}
          <p className="mt-0.5 text-base font-bold leading-normal">
            {discount > 0 && (
              <span className="mr-1.5 text-accent">
                {discount}%<span className="sr-only"> 할인</span>
              </span>
            )}
            {won(price)}원
          </p>
          {reviewCount !== undefined && reviewCount > 0 && (
            <p className="mt-1 flex items-center gap-1 text-[0.8125rem] text-ink-muted">
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              >
                <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" />
              </svg>
              <span className="sr-only">후기</span>
              {reviewCount > 9999 ? "9,999+" : won(reviewCount)}
            </p>
          )}
          {!href && (
            <p className="mt-1 text-xs text-ink-muted">
              상품 상세 페이지 준비 중
            </p>
          )}
        </>,
        "mt-3.5 block",
      )}
    </div>
  );
}
