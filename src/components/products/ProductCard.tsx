// 상품 목록·기획전 카드 (B 담당 · v2 시안에서 마켓컬리 형식으로 통일)
// 화면은 공통 ProductPreviewCard(사진 → [담기] → [농가] 이름 → 홍보 문구 → 정가 → 할인율·가격 → 후기)를 그대로 써요.
// 부르는 쪽(ProductSection, /products)은 바꾸지 않아도 돼요.

import { ProductPreviewCard } from "@/components/common/ProductPreviewCard";
import { routes } from "@/lib/routes";
import type { Product } from "@/types/product";

export default function ProductCard({
  product,
  preload = false,
}: {
  product: Product;
  preload?: boolean; // 첫 화면 사진은 먼저 불러와요
}) {
  return (
    <ProductPreviewCard
      name={product.name}
      imageUrl={product.imageUrl}
      vegetableId={product.vegetableId}
      unit={product.unit}
      price={product.price}
      originalPrice={product.originalPrice}
      uglyReason={product.uglyReason}
      eyebrow={product.farmName}
      description={product.tagline}
      href={routes.product(product.id) ?? `/products/${product.id}`}
      productId={product.id}
        stock={product.stock}
      reviewCount={product.reviewCount}
      priority={preload}
    />
  );
}
