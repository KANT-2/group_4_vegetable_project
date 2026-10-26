// 레시피 목록의 검색창 · 조리 난이도 · 채소 필터 (A 담당)
// 검색·필터 상태는 주소(?q=…&difficulty=…&vegetable=…)에 들어가서 새로고침·뒤로 가기·링크 공유가 그대로 동작해요.
// 자바스크립트가 없어도 동작하는 일반 폼과 링크로 만들었어요.

import Form from "next/form";
import ScrollRow from "@/components/products/ScrollRow";
import Link from "next/link";
import { SearchIcon } from "@/components/common/Icons";
import { routes } from "@/lib/routes";
import {
  RECIPE_DIFFICULTY_LABELS,
  type RecipeDifficulty,
  type RecipeFilters as Filters,
  type RecipeVegetableOption,
} from "@/types/recipe";

// 조건을 유지한 목록 주소. page 는 2쪽부터만 붙여요.
export function recipeListHref(filters: Filters, page = 1) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.vegetable) params.set("vegetable", filters.vegetable);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${routes.recipes}?${query}` : routes.recipes;
}
const listHref = (filters: Filters) => recipeListHref(filters);

export function RecipeFilters({
  filters,
  vegetables,
}: {
  filters: Filters;
  vegetables: RecipeVegetableOption[];
}) {
  return (
    <div className="space-y-3 md:space-y-5">
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
            className="field min-h-11 text-sm md:min-h-12 md:text-base"
          />
        </div>
        {/* 검색 버튼 왼쪽: 조리 난이도 (검색을 누르면 함께 적용돼요) */}
        <label htmlFor="recipe-difficulty" className="sr-only">
          조리 난이도
        </label>
        <select
          id="recipe-difficulty"
          name="difficulty"
          defaultValue={filters.difficulty ?? ""}
          className="field min-h-11 w-28 shrink-0 px-3 text-sm md:min-h-12 md:w-40 md:text-base"
        >
          <option value="">난이도 전체</option>
          {(
            Object.entries(RECIPE_DIFFICULTY_LABELS) as [
              RecipeDifficulty,
              string,
            ][]
          ).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn btn-primary min-h-11 shrink-0 px-4 text-sm md:min-h-12 md:px-5 md:text-base"
        >
          <SearchIcon width={20} height={20} />
          검색
        </button>
      </Form>

      <nav
        aria-label="채소로 레시피 거르기"
        className="-mx-4 border-b border-line md:mx-0"
      >
        <ScrollRow label="채소" className="gap-1 px-2 md:gap-2 md:px-0">
          <FilterChip
            href={listHref({ q: filters.q, difficulty: filters.difficulty })}
            active={!filters.vegetable}
            label="전체"
          />
          {vegetables.map((vegetable) => (
            <FilterChip
              key={vegetable.id}
              href={listHref({
                q: filters.q,
                difficulty: filters.difficulty,
                vegetable: vegetable.id,
              })}
              active={filters.vegetable === vegetable.id}
              label={vegetable.name}
            />
          ))}
        </ScrollRow>
      </nav>
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
      scroll={false}
      className={`inline-flex min-h-12 shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm font-bold transition-colors md:px-4 md:text-base ${
        active
          ? "border-brand text-brand-dark"
          : "border-transparent text-ink-muted hover:text-brand-dark"
      }`}
    >
      {label}
    </Link>
  );
}
