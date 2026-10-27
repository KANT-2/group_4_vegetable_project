// 상품 목록(/products) 카드 (2026-10-26 시안)
// 흰 카드: 사진(못난이 이유·구매 옵션 배지, 찜) → 상품명 → 홍보 문구 → 용량 → 가격 · [담기]
// 홈·레시피 등 다른 화면은 기존 ProductPreviewCard 를 그대로 써요.

import Link from "next/link";
import { ProductImageRotator } from "@/components/products/ProductImageRotator";
import { QuickAddButton } from "@/components/common/QuickAddButton";
import { WishlistButton } from "@/components/shopping/WishlistButton";
import { COLLECTIONS, type CollectionKey } from "@/lib/catalog";
import { getDiscountRate } from "@/lib/format";
import { getProductImages } from "@/lib/product-gallery";
import { routes } from "@/lib/routes";
import { LOW_STOCK } from "@/lib/stock";
import { UGLY_REASON_LABELS, type Product } from "@/types/product";

// 구매 옵션 배지 색: 제철·할인은 주황 계열, 대용량·소포장은 초록 계열
const BADGE_COLORS: Record<CollectionKey, string> = {
  seasonal: "bg-brand",
  bigsale: "bg-accent",
  bulk: "bg-green-700",
  single: "bg-green-700",
};

const won = (n: number) => n.toLocaleString("ko-KR");

export function CatalogProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean; // 첫 화면 사진은 먼저 불러와요
}) {
  const href = routes.product(product.id) ?? `/products/${product.id}`;
  const discount = getDiscountRate(product.price, product.originalPrice);
  const badges = (Object.keys(COLLECTIONS) as CollectionKey[]).filter((key) =>
    COLLECTIONS[key].match(product),
  );
  const soldOut = product.stock === 0;
  const fewLeft =
    product.stock !== undefined &&
    product.stock > 0 &&
    product.stock <= LOW_STOCK;

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-card transition-shadow hover:shadow-md">
      <div className="relative">
        <Link href={href} className="block overflow-hidden bg-sand">
          <ProductImageRotator
            images={getProductImages(product)}
            name={product.name}
            priority={priority}
            className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {soldOut && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-xl font-bold text-white">
              품절
            </span>
          )}
        </Link>
        <span className="absolute left-2.5 top-2.5 rounded-[0.25rem] bg-white/90 px-2 py-0.5 text-xs font-semibold text-brand-dark">
          {UGLY_REASON_LABELS[product.uglyReason]}
        </span>
        <div className="absolute right-2 top-2 z-10">
          <WishlistButton
            productId={product.id}
            productName={product.name}
            initialWished={false}
            compact
          />
        </div>
        {(badges.length > 0 || fewLeft) && (
          <ul
            aria-label="구매 옵션"
            className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5"
          >
            {badges.map((key) => (
              <li
                key={key}
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold text-white ${BADGE_COLORS[key]}`}
              >
                {COLLECTIONS[key].option}
              </li>
            ))}
            {fewLeft && (
              <li className="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-accent">
                {product.stock}개 남음
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <Link href={href} className="block">
          <h3 className="line-clamp-1 text-base font-bold text-ink">
            {product.name}
          </h3>
          {product.tagline && (
            <p className="mt-1 line-clamp-1 text-sm text-ink-muted">
              {product.tagline}
            </p>
          )}
          <p className="mt-2 line-clamp-1 text-xs text-ink-muted">
            {product.unit} · {product.farmName}
          </p>
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="leading-tight">
            {discount > 0 && (
              <span className="block text-xs text-ink-muted">
                <span className="mr-1 font-bold text-accent">
                  {discount}%<span className="sr-only"> 할인</span>
                </span>
                <del>
                  <span className="sr-only">정가 </span>
                  {won(product.originalPrice)}원
                </del>
              </span>
            )}
            <span className="text-lg font-extrabold text-ink">
              {won(product.price)}원
            </span>
          </p>
          {!soldOut && (
            <QuickAddButton
              productId={product.id}
              productName={product.name}
              variant="icon"
            />
          )}
        </div>
      </div>
    </article>
  );
}
