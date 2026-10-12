import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import { formatPrice, getDiscountRate } from "@/lib/format";
import { UGLY_REASON_LABELS, type Product } from "@/types/product";

export default function ProductCard({
  product,
  preload = false,
}: {
  product: Product;
  preload?: boolean; // 첫 화면 사진은 먼저 불러와요
}) {
  const discountRate = getDiscountRate(product.price, product.originalPrice);

  return (
    <Link
      href={`/products/${product.id}`}
      className="card block overflow-hidden transition hover:-translate-y-0.5"
    >
      {/* 사진 1:1 + 못난이 이유 꼬리표 */}
      <div className="relative aspect-square w-full bg-sand">
        {product.imageUrl && (
          <SafeImage
            src={product.imageUrl}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover"
            priority={preload}
          />
        )}
        <span className="chip absolute left-2 top-2 bg-surface text-brand-dark">
          {UGLY_REASON_LABELS[product.uglyReason]}
        </span>
      </div>

      {/* 홍보 문구 → 이름·단위 → 할인율·가격·정상가 → 별점·농가 */}
      <div className="p-3 sm:p-4">
        <p className="line-clamp-1 text-xs text-ink-muted">
          {product.tagline ?? product.farmName}
        </p>
        <h3 className="mt-1 text-sm font-bold text-ink sm:text-base">
          {product.name}
        </h3>
        <p className="text-xs text-ink-muted">{product.unit}</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
          {discountRate > 0 && (
            <span className="font-bold text-accent">{discountRate}%</span>
          )}
          <span className="font-bold text-ink">
            {formatPrice(product.price)}
          </span>
          {discountRate > 0 && (
            <span className="text-xs text-ink-muted line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-ink-muted">
          {product.rating !== undefined && (
            <>
              <span aria-hidden className="text-amber-500">
                ★
              </span>
              <span className="sr-only">별점</span>
              <span className="font-semibold text-ink">
                {product.rating.toFixed(1)}
              </span>
              <span>({product.reviewCount})</span>
            </>
          )}
          {/* 홍보 문구가 없으면 위에 농가 이름이 이미 보여서 생략 */}
          {product.tagline && (
            <span className="truncate">
              {product.rating !== undefined && "· "}
              {product.farmName}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
