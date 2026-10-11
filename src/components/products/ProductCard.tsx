import Image from "next/image";
import Link from "next/link";
import { formatPrice, getDiscountRate } from "@/lib/format";
import { UGLY_REASON_LABELS, type Product } from "@/types/product";

// TODO: A의 globals.css 색 이름(bg-surface, text-accent 등)이 main에 오면 교체
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
      className="block overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200 transition hover:shadow-md"
    >
      {/* 사진 1:1 + 못난이 이유 꼬리표 */}
      <div className="relative aspect-square w-full bg-amber-50">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover"
            preload={preload}
          />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-green-800">
          {UGLY_REASON_LABELS[product.uglyReason]}
        </span>
      </div>

      {/* 홍보 문구 → 이름·단위 → 할인율·가격·정상가 → 별점·농가 */}
      <div className="p-3 sm:p-4">
        <p className="line-clamp-1 text-xs text-stone-500">
          {product.tagline ?? product.farmName}
        </p>
        <h3 className="mt-1 text-sm font-bold text-stone-900 sm:text-base">
          {product.name}
        </h3>
        <p className="text-xs text-stone-500">{product.unit}</p>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
          {discountRate > 0 && (
            <span className="font-bold text-orange-700">{discountRate}%</span>
          )}
          <span className="font-bold text-stone-900">
            {formatPrice(product.price)}
          </span>
          {discountRate > 0 && (
            <span className="text-xs text-stone-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          {product.rating !== undefined && (
            <>
              <span aria-hidden className="text-amber-500">
                ★
              </span>
              <span className="sr-only">별점</span>
              <span className="font-semibold text-stone-700">
                {product.rating.toFixed(1)}
              </span>
              <span>({product.reviewCount})</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span className="truncate">{product.farmName}</span>
        </p>
      </div>
    </Link>
  );
}
