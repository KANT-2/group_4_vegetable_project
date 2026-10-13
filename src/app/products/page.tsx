import Link from "next/link";
import { VisitMark } from "@/components/products/BackLink";
import MockDataNotice from "@/components/products/MockDataNotice";
import { rankProducts } from "@/lib/product-ranking";
import ProductCard from "@/components/products/ProductCard";
import ProductFilters from "@/components/products/ProductFilters";
import ProductSection from "@/components/products/ProductSection";
import { COLLECTIONS, type CollectionKey } from "@/lib/catalog";
import { getDiscountRate } from "@/lib/format";
import { catalogFiltersSchema } from "@/schemas/product";
import { isMockCatalog } from "@/services/catalog-source";
import { countByReason, getProductList } from "@/services/products";
import type { Product } from "@/types/product";

export const metadata = { title: "상품 목록" };

// 코너마다 4개: 같은 채소가 겹치지 않게 먼저 고르고, 모자라면 나머지로 채워요.
function pickFour(list: Product[]) {
  const seen = new Set<string>();
  const first = list.filter((p) =>
    seen.has(p.vegetableId) ? false : (seen.add(p.vegetableId), true),
  );
  const rest = list.filter((p) => !first.includes(p));
  return [...first, ...rest].slice(0, 4);
}

// 주소: /products?category=root&reason=small&sort=price_asc&collection=seasonal
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 1. 주소의 조건을 검사해서 허용된 값만 남겨요.
  const filters = catalogFiltersSchema.parse(await searchParams);
  const collection = filters.collection
    ? COLLECTIONS[filters.collection]
    : null;
  // 2. 고른 분류(와 코너)의 상품을 가져와요. (DB 또는 Mock)
  const all = await getProductList({ ...filters, reason: undefined });
  const inCategory = collection ? all.filter(collection.match) : all;
  // 3. 못난이 이유 버튼마다 몇 개인지 세고, 고른 이유로 한 번 더 걸러요.
  const reasonCounts = countByReason(inCategory);
  const products = filters.reason
    ? inCategory.filter((p) => p.uglyReason === filters.reason)
    : inCategory;

  // 아무 조건도 고르지 않았을 때만 코너를 보여 줘요.
  const showSections =
    !filters.category &&
    !filters.reason &&
    !filters.collection &&
    !filters.q &&
    filters.sort === "recommended";
  // 앞 코너에 나온 상품은 다음 코너에서 빼서 겹치지 않게 해요.
  const shown = new Set<string>();
  const sections = showSections
    ? (Object.keys(COLLECTIONS) as CollectionKey[]).map((key) => {
        let list = rankProducts(
          all.filter((p) => COLLECTIONS[key].match(p) && !shown.has(p.id)),
        );
        if (key === "bigsale")
          list = [...list].sort(
            (a, b) =>
              getDiscountRate(b.price, b.originalPrice) -
              getDiscountRate(a.price, a.originalPrice),
          );
        const picked = pickFour(list);
        picked.forEach((p) => shown.add(p.id));
        return { key, ...COLLECTIONS[key], products: picked };
      })
    : [];

  return (
    <div className="container-page py-4">
      <VisitMark />
      {/* 기획전 이름은 상단 메뉴에 이미 보여서 큰 제목 없이 화면 읽기용으로만 둬요. */}
      <h1 className="sr-only">{collection?.title ?? "상품 목록"}</h1>
      {/* 코너 이동은 헤더 메뉴(제철·특가·대용량·1인 가구)에서 해요. */}

      {filters.q && (
        <p className="mt-6 text-xl font-bold text-ink">
          ‘{filters.q}’ 검색 결과
        </p>
      )}

      {sections.length > 0 && (
        <div className="mt-6">
          {sections.map((s, i) => (
            <ProductSection
              key={s.key}
              eyebrow={s.eyebrow}
              title={s.title}
              description={s.description}
              products={s.products}
              moreHref={`/products?collection=${s.key}`}
              preloadFirst={i === 0}
            />
          ))}
          <h2 className="mt-12 text-xl font-extrabold tracking-[-0.02em] text-ink">
            전체 상품
          </h2>
        </div>
      )}

      <div className="mt-4">
        <ProductFilters filters={filters} reasonCounts={reasonCounts} />
      </div>

      <p className="mb-3 mt-4 text-sm text-ink-muted">
        상품 {products.length}개
      </p>

      {filters.sort === "reviews" && (
        <p className="mb-4 text-sm text-ink-muted">
          리뷰 수가 많은 순서예요. 현재 별점·리뷰 수는 시연용 예시이며 실제 구매
          인기 순위는 아니에요.
        </p>
      )}
      {products.length > 0 ? (
        // 모바일 2열 → 데스크톱(lg) 4열
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-[18px] lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              preload={!showSections && index < 2}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-surface p-10 text-center ring-1 ring-line">
          <p className="font-bold text-ink">
            {filters.q
              ? `‘${filters.q}’에 맞는 상품이 없어요.`
              : "조건에 맞는 상품이 없어요."}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {filters.q
              ? "채소 이름(예: 감자)으로 찾아보세요."
              : "다른 조건을 골라 보세요."}
          </p>
          <Link href="/products" className="mt-4 btn btn-primary">
            조건 초기화
          </Link>
        </div>
      )}

      <div className="mt-8">
        <MockDataNotice usingMock={isMockCatalog()} />
      </div>
    </div>
  );
}
