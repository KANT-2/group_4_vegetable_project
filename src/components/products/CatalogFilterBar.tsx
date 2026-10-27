// 상품 목록 필터 줄 (2026-10-26 시안 A)
// - CatalogCategoryTabs: 카테고리 밑줄 탭
// - CatalogOptionChips: 구매 옵션 작은 칩 (여러 개 고를 수 있어요)
// 모두 링크라 자바스크립트 없이도 동작하고, 지금 조건에서 하나만 바꾼 주소로 이동해요.

import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import {
  catalogHref,
  COLLECTIONS,
  toggleCollection,
  type CollectionKey,
} from "@/lib/catalog";
import type { CatalogFilters } from "@/schemas/product";
import {
  VEGETABLE_CATEGORY_LABELS,
  type VegetableCategory,
} from "@/types/vegetable";
import {
  BoxIcon,
  LeafIcon,
  TagIcon,
  UserIcon,
} from "@/components/common/Icons";

const categories = Object.entries(VEGETABLE_CATEGORY_LABELS) as [
  VegetableCategory,
  string,
][];
const collections = Object.keys(COLLECTIONS) as CollectionKey[];

const OPTION_ICONS: Record<
  CollectionKey,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  seasonal: LeafIcon,
  bigsale: TagIcon,
  bulk: BoxIcon,
  single: UserIcon,
};

export function CatalogCategoryTabs({ filters }: { filters: CatalogFilters }) {
  // 카테고리를 바꾸면 제철 달력에서 고른 채소는 풀어요(서로 어긋나 0개가 되지 않게).
  const tabs: [VegetableCategory | undefined, string][] = [
    [undefined, "전체"],
    ...categories,
  ];
  return (
    <nav
      aria-label="카테고리"
      className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max gap-1">
        {tabs.map(([value, label]) => {
          const active = filters.category === value && !filters.vegetable;
          return (
            <li key={label}>
              <Link
                href={catalogHref(filters, {
                  category: value,
                  vegetable: undefined,
                })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`relative inline-flex min-h-12 items-center whitespace-nowrap px-3.5 text-[0.9375rem] transition-colors ${
                  active
                    ? "font-extrabold text-ink after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand"
                    : "font-semibold text-ink-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function CatalogOptionChips({ filters }: { filters: CatalogFilters }) {
  return (
    <ul aria-label="구매 옵션" className="flex flex-wrap gap-2">
      {collections.map((key) => {
        const Icon = OPTION_ICONS[key];
        const active = Boolean(filters.collection?.includes(key));
        return (
          <li key={key}>
            <Link
              href={catalogHref(filters, {
                collection: toggleCollection(filters.collection, key),
              })}
              scroll={false}
              aria-pressed={active}
              className={`inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[0.8125rem] font-semibold transition-colors ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
              }`}
            >
              <Icon
                width={15}
                height={15}
                className={active ? "text-white" : "text-brand"}
              />
              {COLLECTIONS[key].option}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
