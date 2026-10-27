import Link from "next/link";
import { VisitMark } from "@/components/products/BackLink";
import { CatalogProductCard } from "@/components/products/CatalogProductCard";
import {
  CatalogCategoryTabs,
  CatalogOptionChips,
} from "@/components/products/CatalogFilterBar";
import { LinkSelect } from "@/components/products/LinkSelect";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ResetIcon,
} from "@/components/common/Icons";
import { catalogHref, SORT_LABELS } from "@/lib/catalog";
import { catalogFiltersSchema } from "@/schemas/product";
import { getCatalogPage } from "@/services/products";
import { getVegetables } from "@/services/vegetables";
import { seasonMonths } from "@/lib/farm-story";
import { SeasonCalendar } from "@/components/products/SeasonCalendar";
import {
  UGLY_REASON_LABELS,
  type ProductSort,
  type UglyReason,
} from "@/types/product";

export const metadata = { title: "상품 목록" };

// 한 페이지 상품 수: 2·3·4열 모두 줄이 딱 맞는 24개
const PAGE_SIZE = 24;

// 주소: /products?category=root&collection=seasonal&collection=bulk&reason=small&sort=price_asc&q=당근
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 1. 주소의 조건을 검사해서 허용된 값만 남겨요.
  const params = await searchParams;
  const filters = catalogFiltersSchema.parse(params);
  const rawPage = Number(
    Array.isArray(params.page) ? params.page[0] : params.page,
  );
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 100000
      ? rawPage
      : 1;

  // 2. 지금 페이지 상품과 못난이 이유별 개수를 가져와요.
  const [result, vegetables] = await Promise.all([
    getCatalogPage(filters, page, PAGE_SIZE),
    getVegetables(),
  ]);
  // 제철 채소 달력: 채소마다 제철 달 목록, 시작 달은 한국 시간 기준 이번 달
  const seasonVegetables = vegetables
    .map((vegetable) => ({
      id: vegetable.id,
      name: vegetable.name,
      imageUrl: vegetable.imageUrl,
      months: seasonMonths(vegetable.season),
    }))
    .filter((vegetable) => vegetable.months.length > 0);
  // 달력에서 채소를 누르면 다른 조건은 풀고 그 채소 상품만(정렬은 유지), 고른 채소를 다시 누르면 해제
  const selectedVegetable = vegetables.find(
    (vegetable) => vegetable.id === filters.vegetable,
  );
  const vegetableHrefs = Object.fromEntries(
    seasonVegetables.map((vegetable) => [
      vegetable.id,
      catalogHref(
        { sort: filters.sort },
        {
          vegetable:
            vegetable.id === filters.vegetable ? undefined : vegetable.id,
        },
      ),
    ]),
  );
  const thisMonth = Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Seoul",
    }).format(new Date()),
  );
  // 카테고리·채소·구매 옵션·못난이 이유·검색어·정렬 중 하나라도 바뀌어 있으면 초기화 버튼을 보여요.
  const hasFilter = Boolean(
    filters.category ||
    filters.vegetable ||
    filters.collection?.length ||
    filters.reason ||
    filters.q ||
    filters.sort !== "recommended",
  );
  const products = result.items;
  const pages = Math.ceil(result.total / result.size);
  const pageHref = (number: number) => {
    const href = catalogHref(filters, {});
    return `${href}${href.includes("?") ? "&" : "?"}page=${number}`;
  };
  const sortOptions = (
    Object.entries(SORT_LABELS) as [ProductSort, string][]
  ).map(([value, label]) => ({
    value,
    label,
    href: catalogHref(filters, { sort: value }),
  }));
  // 못난이 이유 드롭다운: 지금 조건에서 이유별 상품 수를 함께 보여 줘요.
  const reasonOptions = [
    {
      value: "",
      label: "못난이 이유 전체",
      href: catalogHref(filters, { reason: undefined }),
    },
    ...(Object.entries(UGLY_REASON_LABELS) as [UglyReason, string][]).map(
      ([value, label]) => ({
        value,
        label: `${label} (${result.reasonCounts[value]})`,
        href: catalogHref(filters, { reason: value }),
      }),
    ),
  ];

  return (
    <div className="container-page py-8">
      <VisitMark />
      <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
        {filters.q
          ? `‘${filters.q}’ 검색 결과`
          : selectedVegetable
            ? `제철 ${selectedVegetable.name} 상품`
            : "신선한 못난이 농산물을 만나보세요"}
      </h1>
      <p className="mt-1.5 text-ink-muted">
        맛과 영양은 그대로, 더 합리적인 가격으로.
      </p>

      {/* 제철 채소 가로 띠: 채소를 누르면 그 채소 상품만 */}
      <div className="mt-6">
        <SeasonCalendar
          vegetables={seasonVegetables}
          startMonth={thisMonth}
          selected={filters.vegetable}
          hrefFor={vegetableHrefs}
        />
      </div>

      {/* 카테고리 밑줄 탭(오른쪽 끝: 조건 초기화) → 구매 옵션 · 못난이 이유 · 정렬 한 줄 */}
      <div className="mt-6 flex items-center gap-3 border-b border-line">
        <div className="min-w-0 flex-1">
          <CatalogCategoryTabs filters={filters} />
        </div>
        {hasFilter && (
          <Link
            href="/products"
            scroll={false}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand"
          >
            <ResetIcon width={15} height={15} />
            조건 초기화
          </Link>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3">
        <CatalogOptionChips filters={filters} />
        <span aria-hidden className="hidden h-6 w-px bg-line sm:block" />
        <LinkSelect
          label="못난이 이유"
          value={filters.reason ?? ""}
          options={reasonOptions}
        />
        <div className="ml-auto flex items-center gap-3">
          <p className="text-sm text-ink-muted" aria-live="polite">
            총 <strong className="text-ink">{result.total}</strong>개 상품
          </p>
          <LinkSelect label="정렬" value={filters.sort} options={sortOptions} />
        </div>
      </div>

      {products.length > 0 ? (
        // 휴대폰 2열 → 태블릿 3열 → 데스크톱 4열
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <CatalogProductCard
              key={product.id}
              product={product}
              priority={index < 3}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-card bg-surface p-10 text-center ring-1 ring-line">
          <p className="font-bold text-ink">
            {filters.q
              ? `‘${filters.q}’에 맞는 상품이 없어요.`
              : "조건에 맞는 상품이 없어요."}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {filters.q
              ? "채소 이름(예: 감자)으로 찾아보세요."
              : "구매 옵션을 줄이거나 다른 카테고리를 골라 보세요."}
          </p>
          <Link href="/products" className="btn btn-primary mt-4">
            조건 초기화
          </Link>
        </div>
      )}

      <div className="mt-10">
        {pages > 1 && (
          <nav
            aria-label="상품 페이지"
            className="mb-8 flex flex-wrap justify-center gap-2"
          >
            {page > 1 && (
              <Link
                className="btn btn-secondary px-3"
                href={pageHref(page - 1)}
                aria-label="이전 페이지"
              >
                <ArrowLeftIcon width={20} height={20} />
              </Link>
            )}
            {Array.from(
              { length: Math.min(pages, 7) },
              (_, i) => Math.max(1, Math.min(page - 3, pages - 6)) + i,
            ).map((number) => (
              <Link
                key={number}
                href={pageHref(number)}
                aria-current={number === page ? "page" : undefined}
                className={`btn ${number === page ? "btn-primary" : "btn-secondary"}`}
              >
                {number}
              </Link>
            ))}
            {page < pages && (
              <Link
                className="btn btn-secondary px-3"
                href={pageHref(page + 1)}
                aria-label="다음 페이지"
              >
                <ArrowRightIcon width={20} height={20} />
              </Link>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
