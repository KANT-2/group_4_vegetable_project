import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import MockDataNotice from "@/components/products/MockDataNotice";
import { formatPrice, getDiscountRate } from "@/lib/format";
import { isMockCatalog } from "@/services/catalog-source";
import { getProductById } from "@/services/products";
import { UGLY_REASON_LABELS } from "@/types/product";

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

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-32 pt-4 sm:px-6 md:pb-12">
      <Link
        href="/products"
        className="inline-flex h-12 items-center text-sm text-stone-500 hover:text-stone-900"
      >
        ← 상품 목록
      </Link>

      {/* 모바일: 세로, 데스크톱(md): 사진 | 정보 */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-amber-50">
          {product.imageUrl && (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              preload
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-green-800">
            {UGLY_REASON_LABELS[product.uglyReason]}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold text-green-800">
            {product.farmName}
            {product.farmRegion && (
              <span className="font-normal text-stone-500">
                {" "}
                · {product.farmRegion}
              </span>
            )}
          </p>
          <div>
            {product.tagline && (
              <p className="text-sm text-stone-500">{product.tagline}</p>
            )}
            <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">
              {product.name}
            </h1>
            {product.rating !== undefined && (
              <p className="mt-1 flex items-center gap-1 text-sm text-stone-500">
                <span aria-hidden className="text-amber-500">
                  ★
                </span>
                <span className="sr-only">별점</span>
                <span className="font-semibold text-stone-700">
                  {product.rating.toFixed(1)}
                </span>
                <span>· 리뷰 {product.reviewCount}개</span>
              </p>
            )}
          </div>
          <p className="text-stone-600">{product.description}</p>

          <p className="flex flex-wrap items-baseline gap-x-3">
            {discountRate > 0 && (
              <span className="text-2xl font-bold text-orange-700">
                {discountRate}%
              </span>
            )}
            <span className="text-2xl font-bold text-stone-900">
              {formatPrice(product.price)}
            </span>
            {discountRate > 0 && (
              <span className="text-stone-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </p>

          <dl className="grid grid-cols-[5rem_1fr] gap-y-2 border-y border-stone-200 py-4 text-sm">
            <dt className="text-stone-500">판매 단위</dt>
            <dd className="text-stone-900">{product.unit}</dd>
            <dt className="text-stone-500">상품 상태</dt>
            <dd className="text-stone-900">{product.conditionNote ?? "-"}</dd>
          </dl>

          {product.farmStory && (
            <div className="rounded-[20px] bg-green-50 p-4">
              <p className="text-sm font-bold text-green-900">농가 이야기</p>
              <p className="mt-1 text-sm text-green-900/80">
                {product.farmStory}
              </p>
            </div>
          )}

          <Link
            href={`/vegetables/${product.vegetableId}`}
            className="inline-flex h-12 items-center text-sm font-semibold text-green-800 underline underline-offset-4"
          >
            이 채소 보관법·손질법 보기 →
          </Link>

          {/* TODO: C의 수량 선택·AddToCartButton·WishlistButton으로 교체 */}
          <button
            type="button"
            disabled
            className="hidden h-12 rounded-xl bg-green-800 font-bold text-white opacity-60 md:block"
          >
            장바구니 담기 (준비 중)
          </button>

          <MockDataNotice usingMock={isMockCatalog()} />
        </div>
      </div>

      {/* 모바일 하단 고정 바: 아이폰 홈 바 영역(safe-area)만큼 띄워요 */}
      <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
        <button
          type="button"
          disabled
          className="h-12 w-full rounded-xl bg-green-800 font-bold text-white opacity-60"
        >
          장바구니 담기 · {formatPrice(product.price)} (준비 중)
        </button>
      </div>
    </main>
  );
}
