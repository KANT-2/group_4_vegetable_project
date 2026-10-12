import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types/product";

// 상품 코너: 제목 + 설명 + 카드 4개 + 더보기
// 메인 화면(A)에서도 같은 부품을 가져다 쓸 수 있어요.
export default function ProductSection({
  emoji,
  title,
  description,
  products,
  moreHref,
  preloadFirst = false,
}: {
  emoji: string;
  title: string;
  description: string;
  products: Product[];
  moreHref?: string;
  preloadFirst?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mt-14 first:mt-4">
      {/* v2 시안(마켓컬리 기준): 가운데 제목 + › 링크, 아래 회색 설명 */}
      <div className="mb-5 text-center md:mb-7">
        <h2 className="text-[1.375rem] font-medium leading-snug text-ink md:text-[1.75rem]">
          {moreHref ? (
            <Link
              href={moreHref}
              className="inline-flex items-center gap-1 hover:text-brand"
            >
              <span aria-hidden>{emoji}</span> {title}
              <span
                aria-hidden
                className="text-[1.6em] font-light leading-none"
              >
                ›
              </span>
            </Link>
          ) : (
            <>
              <span aria-hidden>{emoji}</span> {title}
            </>
          )}
        </h2>
        <p className="mt-1 text-sm text-ink-muted md:text-base">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-[18px] lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            preload={preloadFirst && index < 2}
          />
        ))}
      </div>
    </section>
  );
}
