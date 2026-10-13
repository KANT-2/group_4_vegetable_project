import { SectionHeading } from "@/components/common/SectionHeading";
import ProductCard from "@/components/products/ProductCard";
import type { Product } from "@/types/product";

// 상품 코너: 제목 + 설명 + 카드 4개 + 더보기
// 메인 화면(A)에서도 같은 부품을 가져다 쓸 수 있어요.
export default function ProductSection({
  eyebrow,
  title,
  description,
  products,
  moreHref,
  preloadFirst = false,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  products: Product[];
  moreHref?: string;
  preloadFirst?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mt-14 first:mt-4">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        sub={description}
        href={moreHref}
      />

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
