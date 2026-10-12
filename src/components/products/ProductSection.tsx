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
    <section className="mt-8 first:mt-0">
      <div className="flex items-center gap-3 rounded-[20px] bg-gradient-to-b from-green-50 to-transparent px-4 py-4 sm:px-6">
        <span aria-hidden className="text-3xl">
          {emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-stone-900 sm:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-stone-500">{description}</p>
        </div>
        {moreHref && (
          <Link
            href={moreHref}
            className="inline-flex h-12 shrink-0 items-center rounded-full bg-white px-4 text-sm font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100"
          >
            더보기 ›
          </Link>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
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
