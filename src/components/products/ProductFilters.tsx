import Link from "next/link";
import { catalogHref, SORT_LABELS } from "@/lib/catalog";
import ScrollRow from "./ScrollRow";
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

// 고르기 탭: 글자 + 고른 탭에만 밑줄. 누르는 높이는 디자인 규칙대로 48px(h-12)
// 상품이 0개인 탭은 눌러도 빈 화면이라 흐리게 막아 둬요.
const TAB =
  "relative inline-flex h-12 shrink-0 items-center whitespace-nowrap px-2 text-[15px]";

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
        className={`${TAB} cursor-not-allowed font-semibold text-ink-muted/40`}
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
        `${TAB} transition ` +
        (active
          ? "font-bold text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-accent"
          : "font-semibold text-ink-muted hover:text-ink")
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
      {/* 분류 + 못난이 이유를 한 줄로: 모바일은 옆으로 밀어서, 큰 화면은 넘치면 다음 줄로 */}
      <div className="-mx-4 border-b border-line sm:mx-0">
        <ScrollRow label="분류" className="gap-1 px-2 sm:flex-wrap sm:px-0">
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
          <span
            aria-hidden
            className="mx-2 h-4 w-px shrink-0 self-center bg-line"
          />
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
              <span className="ml-1 text-xs font-normal text-ink-muted">
                {reasonCounts[value]}
              </span>
            </Chip>
          ))}
        </ScrollRow>
      </div>

      {/* 정렬 + 초기화 */}
      <div className="-mx-4 sm:mx-0">
        <ScrollRow label="정렬" className="items-center gap-1 px-4 sm:px-0">
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
        </ScrollRow>
      </div>
    </div>
  );
}
