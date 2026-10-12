import Link from "next/link";
import { catalogHref, SORT_LABELS } from "@/lib/catalog";
import type { CatalogFilters } from "@/schemas/product";
import {
  UGLY_REASON_LABELS,
  type ProductSort,
  type UglyReason,
} from "@/types/product";
import {
  VEGETABLE_CATEGORY_LABELS,
  type VegetableCategory,
} from "@/types/vegetable";

// 고르기 버튼: 디자인 규칙대로 높이 48px(h-12)
// 상품이 0개인 버튼은 눌러도 빈 화면이라 흐리게 막아 둬요.
function Chip({
  href,
  active,
  disabled = false,
  children,
}: {
  href: string;
  active: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex h-12 shrink-0 cursor-not-allowed items-center rounded-full bg-brand-soft px-4 text-sm font-semibold text-ink-muted"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={
        "inline-flex h-12 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition " +
        (active
          ? "bg-brand text-white"
          : "bg-surface text-ink-muted ring-1 ring-line hover:bg-brand-soft")
      }
    >
      {children}
    </Link>
  );
}

export default function ProductFilters({
  filters,
  reasonCounts,
}: {
  filters: CatalogFilters;
  reasonCounts: Record<UglyReason, number>; // 지금 분류 안에서 이유별 개수
}) {
  const categories = Object.entries(VEGETABLE_CATEGORY_LABELS) as [
    VegetableCategory,
    string,
  ][];
  const reasons = Object.entries(UGLY_REASON_LABELS) as [UglyReason, string][];
  const sorts = Object.entries(SORT_LABELS) as [ProductSort, string][];
  const hasFilter = Boolean(
    filters.category || filters.reason || filters.sort !== "recommended",
  );

  return (
    <div className="flex flex-col gap-2">
      {/* 1줄: 채소 분류 (모바일에서는 옆으로 밀어서 봐요) */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip
          href={catalogHref(filters, { category: undefined })}
          active={!filters.category}
        >
          전체
        </Chip>
        {categories.map(([value, label]) => (
          <Chip
            key={value}
            href={catalogHref(filters, { category: value })}
            active={filters.category === value}
          >
            {label}
          </Chip>
        ))}
      </div>

      {/* 2줄: 못난이 이유 */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {reasons.map(([value, label]) => (
          <Chip
            key={value}
            // 이미 고른 걸 다시 누르면 해제
            href={catalogHref(filters, {
              reason: filters.reason === value ? undefined : value,
            })}
            active={filters.reason === value}
            disabled={reasonCounts[value] === 0 && filters.reason !== value}
          >
            {label}
            <span className="ml-1 font-normal opacity-70">
              {reasonCounts[value]}
            </span>
          </Chip>
        ))}
      </div>

      {/* 정렬 + 초기화 */}
      <div className="-mx-4 flex items-center gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {sorts.map(([value, label]) => (
          <Link
            key={value}
            href={catalogHref(filters, { sort: value })}
            scroll={false}
            aria-current={filters.sort === value ? "true" : undefined}
            className={
              "inline-flex h-12 shrink-0 items-center px-2 text-sm " +
              (filters.sort === value
                ? "font-bold text-brand-dark"
                : "text-ink-muted hover:text-ink")
            }
          >
            {label}
          </Link>
        ))}
        {hasFilter && (
          <Link
            href="/products"
            scroll={false}
            className="ml-auto inline-flex h-12 shrink-0 items-center px-2 text-sm text-accent hover:underline"
          >
            초기화
          </Link>
        )}
      </div>
    </div>
  );
}
