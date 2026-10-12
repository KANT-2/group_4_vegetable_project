import Link from "next/link";
import BackLink from "@/components/products/BackLink";
import { SafeImage } from "@/components/common/SafeImage";
import { notFound } from "next/navigation";
import MockDataNotice from "@/components/products/MockDataNotice";
import { AddToCartButton } from "@/components/shopping/AddToCartButton";
import { WishlistButton } from "@/components/shopping/WishlistButton";
import { formatPrice, getDiscountRate } from "@/lib/format";
import { isMockCatalog } from "@/services/catalog-source";
import { getSavedState } from "@/services/cart";
import { getProductById } from "@/services/products";
import { UGLY_REASON_LABELS } from "@/types/product";

// 브라우저 탭 제목: "못난이 당근 1kg | 못난이마켓"
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const product = await getProductById((await params).id);
  return { title: product?.name ?? "상품을 찾을 수 없어요" };
}

// 주소: /products/carrot-bent-1kg → id = "carrot-bent-1kg"
export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  // 없거나 판매 종료된 상품 → not-found.tsx
  if (!product) notFound();

  const discountRate = getDiscountRate(product.price, product.originalPrice);
  const saved = await getSavedState(product.id);

  return (
    <div className="container-page pb-32 pt-4 md:pb-12">
      <BackLink fallbackHref="/products" />

      {/* 모바일: 세로, 데스크톱(md): 사진 | 정보 */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="relative aspect-square w-full overflow-hidden rounded-card bg-sand">
          {product.imageUrl && (
            <SafeImage
              src={product.imageUrl}
              alt={product.name}
              className="absolute inset-0 h-full w-full object-cover"
              priority
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-sm font-semibold text-brand-dark">
            {UGLY_REASON_LABELS[product.uglyReason]}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-brand-dark">
            {product.farmName}
            {product.farmRegion && (
              <span className="font-normal text-ink-muted">
                {" "}
                · {product.farmRegion}
              </span>
            )}
          </p>
          <div>
            {product.tagline && (
              <p className="text-sm text-ink-muted">{product.tagline}</p>
            )}
            <h1 className="text-2xl font-bold text-ink sm:text-3xl">
              {product.name}
            </h1>
            {product.rating !== undefined && (
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                <span aria-hidden className="text-amber-500">
                  ★
                </span>
                <span className="sr-only">별점</span>
                <span className="font-semibold text-ink-muted">
                  {product.rating.toFixed(1)}
                </span>
                <span>· 리뷰 {product.reviewCount}개</span>
              </p>
            )}
          </div>
          <p className="text-ink-muted">{product.description}</p>

          <p className="flex flex-wrap items-baseline gap-x-3">
            {discountRate > 0 && (
              <span className="text-2xl font-bold text-accent">
                {discountRate}%
              </span>
            )}
            <span className="text-2xl font-bold text-ink">
              {formatPrice(product.price)}
            </span>
            {discountRate > 0 && (
              <span className="text-ink-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </p>

          <dl className="grid grid-cols-[5rem_1fr] gap-y-2 border-y border-line py-4 text-sm">
            <dt className="text-ink-muted">판매 단위</dt>
            <dd className="text-ink">{product.unit}</dd>
            <dt className="text-ink-muted">상품 상태</dt>
            <dd className="text-ink">{product.conditionNote ?? "-"}</dd>
          </dl>

          {product.farmStory && (
            <div className="rounded-card bg-brand-soft p-4">
              <p className="text-sm font-bold text-brand-dark">농가 이야기</p>
              <p className="mt-1 text-sm text-brand-dark/80">
                {product.farmStory}
              </p>
            </div>
          )}

          <Link
            href={`/vegetables/${product.vegetableId}`}
            className="inline-flex h-12 items-center text-sm font-semibold text-brand-dark underline underline-offset-4"
          >
            이 채소 보관법·손질법 보기 →
          </Link>

          {/* 넓은 화면: 수량·담기·찜 (모바일은 하단 고정 바) */}
          <div className="hidden items-start gap-3 md:flex">
            <div className="flex-1">
              <AddToCartButton
                productId={product.id}
                productName={product.name}
                price={product.price}
              />
            </div>
            <WishlistButton
              productId={product.id}
              productName={product.name}
              initialWished={saved.wished}
              compact
            />
          </div>

          <MockDataNotice usingMock={isMockCatalog()} />
        </div>
      </div>

      {/* 모바일 하단 고정 바: 아이폰 홈 바 영역(safe-area)만큼 띄워요 */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-start gap-2">
          <WishlistButton
            productId={product.id}
            productName={product.name}
            initialWished={saved.wished}
            compact
          />
          <div className="flex-1">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              price={product.price}
              layout="bar"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
