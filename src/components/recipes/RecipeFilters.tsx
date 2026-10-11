// 레시피 목록의 검색창과 채소 필터 (A 담당)
// 검색·필터 상태는 주소(?q=…&vegetable=…)에 들어가서 새로고침·뒤로 가기·링크 공유가 그대로 동작해요.
// 자바스크립트가 없어도 동작하는 일반 폼과 링크로 만들었어요.

import Form from "next/form";
import Link from "next/link";
import { SearchIcon } from "@/components/common/Icons";
import { routes } from "@/lib/routes";
import type {
  RecipeFilters as Filters,
  RecipeVegetableOption,
} from "@/types/recipe";

function listHref(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.vegetable) params.set("vegetable", filters.vegetable);
  const query = params.toString();
  return query ? `${routes.recipes}?${query}` : routes.recipes;
}

export function RecipeFilters({
  filters,
  vegetables,
}: {
  filters: Filters;
  vegetables: RecipeVegetableOption[];
}) {
  const hasFilters = Boolean(filters.q || filters.vegetable);

  return (
    <div className="space-y-5">
      <Form action={routes.recipes} role="search" className="flex gap-2">
        {/* 검색어를 바꿔도 선택한 채소는 유지해요. */}
        {filters.vegetable && (
          <input type="hidden" name="vegetable" value={filters.vegetable} />
        )}
        <div className="min-w-0 flex-1">
          <label htmlFor="recipe-q" className="sr-only">
            레시피 검색
          </label>
          <input
            id="recipe-q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            maxLength={50}
            placeholder="요리 이름이나 재료로 검색"
            autoComplete="off"
            enterKeyHint="search"
            className="field"
          />
        </div>
        <button type="submit" className="btn btn-primary shrink-0 px-5">
          <SearchIcon width={20} height={20} />
          검색
        </button>
      </Form>

      <nav aria-label="채소로 레시피 거르기">
        <ul className="flex flex-wrap gap-2">
          <li>
            <FilterChip
              href={listHref({ q: filters.q })}
              active={!filters.vegetable}
              label="전체"
            />
          </li>
          {vegetables.map((vegetable) => (
            <li key={vegetable.id}>
              <FilterChip
                href={listHref({ q: filters.q, vegetable: vegetable.id })}
                active={filters.vegetable === vegetable.id}
                label={vegetable.name}
              />
            </li>
          ))}
        </ul>
      </nav>

      {hasFilters && (
        <Link
          href={routes.recipes}
          className="inline-flex min-h-12 items-center font-bold text-brand-dark underline underline-offset-4"
        >
          검색·필터 초기화
        </Link>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-12 items-center rounded-full border px-5 font-bold transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-surface hover:bg-brand-soft"
      }`}
    >
      {label}
    </Link>
  );
}
