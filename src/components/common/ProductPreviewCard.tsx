// 메인·레시피 상세에서 판매 상품을 간단히 보여주는 카드 (A 담당)
// B의 ProductCard 가 main 에 합쳐지면 그 컴포넌트로 교체할 수 있어요.
// 상품 상세 페이지(B)가 아직 없으면 href 가 null 이고, 링크 없는 카드로만 보여줘요.

import Link from "next/link";
import { UGLY_REASON_LABELS, type UglyReason } from "@/types/product";
import { formatPrice, getDiscountRate } from "@/lib/format";
import { SafeImage } from "./SafeImage";

interface ProductPreviewCardProps {
  name: string;
  imageUrl?: string;
  unit: string;
  price: number;
  originalPrice: number;
  uglyReason: UglyReason;
  eyebrow?: string; // 이름 위에 작게 보여줄 말 (예: 농가 이름)
  href: string | null;
}

export function ProductPreviewCard({
  name,
  imageUrl,
  unit,
  price,
  originalPrice,
  uglyReason,
  eyebrow,
  href,
}: ProductPreviewCardProps) {
  const discount = getDiscountRate(price, originalPrice);

  const body = (
    <>
      <div className="relative">
        <SafeImage
          src={imageUrl}
          alt={`${name} 사진`}
          className="aspect-square w-full rounded-card object-cover"
        />
        <span className="chip absolute left-3 top-3 bg-surface text-brand-dark">
          {UGLY_REASON_LABELS[uglyReason]}
        </span>
      </div>
      <div className="mt-3 px-1">
        {eyebrow && <p className="text-sm text-ink-muted">{eyebrow}</p>}
        <h3 className="font-bold">{name}</h3>
        <p className="text-sm text-ink-muted">{unit}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
          {discount > 0 && (
            <span className="font-extrabold text-accent">{discount}%</span>
          )}
          <span className="font-extrabold">{formatPrice(price)}</span>
          {discount > 0 && (
            <span className="text-sm text-ink-muted line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </p>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="block">
        {body}
        <p className="mt-1 px-1 text-xs text-ink-muted">
          상품 상세 페이지 준비 중
        </p>
      </div>
    );
  }
  return (
    <Link href={href} className="group block">
      {body}
    </Link>
  );
}
