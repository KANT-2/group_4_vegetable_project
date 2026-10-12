import Link from "next/link";
import MockDataNotice from "@/components/products/MockDataNotice";
import ProductCard from "@/components/products/ProductCard";
import ProductFilters from "@/components/products/ProductFilters";
import ProductSection from "@/components/products/ProductSection";
import { COLLECTIONS, type CollectionKey } from "@/lib/catalog";
import { getDiscountRate } from "@/lib/format";
import { catalogFiltersSchema } from "@/schemas/product";
import { isMockCatalog } from "@/services/catalog-source";
import { countByReason, getProductList } from "@/services/products";
import type { Product } from "@/types/product";

export const metadata = { title: "상품 목록 | 못난이마켓" };

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
    filters.sort === "newest";
  // 앞 코너에 나온 상품은 다음 코너에서 빼서 겹치지 않게 해요.
  const shown = new Set<string>();
  const sections = showSections
    ? (Object.keys(COLLECTIONS) as CollectionKey[]).map((key) => {
        let list = all.filter(
          (p) => COLLECTIONS[key].match(p) && !shown.has(p.id),
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
    <main className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6">
      {collection ? (
        <>
          <Link
            href="/products"
            className="inline-flex h-12 items-center text-sm text-stone-500 hover:text-stone-900"
          >
            ← 전체 상품
          </Link>
          <h1 className="text-2xl font-bold text-stone-900">
            {collection.emoji} {collection.title}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {collection.description}
          </p>
        </>
      ) : (
        <>
          {/* 첫 화면에 상품이 보이도록 소개는 한 줄만 */}
          <h1 className="text-2xl font-bold text-stone-900">못난이 상품</h1>
          <p className="mt-1 text-sm text-stone-500">
            모양만 조금 다를 뿐, 맛은 그대로예요.
          </p>
        </>
      )}

      {sections.length > 0 && (
        <div className="mt-6">
          {sections.map((s, i) => (
            <ProductSection
              key={s.key}
              emoji={s.emoji}
              title={s.title}
              description={s.description}
              products={s.products}
              moreHref={`/products?collection=${s.key}`}
              preloadFirst={i === 0}
            />
          ))}
          <h2 className="mt-12 text-xl font-bold text-stone-900">전체 상품</h2>
        </div>
      )}

      <div className="mt-4">
        <ProductFilters filters={filters} reasonCounts={reasonCounts} />
      </div>

      <p className="mb-3 mt-4 text-sm text-stone-500">
        상품 {products.length}개
      </p>

      {products.length > 0 ? (
        // 모바일 2열 → 데스크톱(lg) 4열
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              preload={!showSections && index < 2}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[20px] bg-white p-10 text-center ring-1 ring-stone-200">
          <p className="font-bold text-stone-900">조건에 맞는 상품이 없어요.</p>
          <p className="mt-1 text-sm text-stone-500">
            다른 조건을 골라 보세요.
          </p>
          <Link
            href="/products"
            className="mt-4 inline-flex h-12 items-center rounded-xl bg-green-800 px-5 font-semibold text-white"
          >
            조건 초기화
          </Link>
        </div>
      )}

      <div className="mt-8">
        <MockDataNotice usingMock={isMockCatalog()} />
      </div>
    </main>
  );
}
