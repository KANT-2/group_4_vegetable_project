// 레시피 목록 /recipes (A 담당)
// 검색(q)·조리 난이도(difficulty)·채소 필터(vegetable)·쪽(page)은 주소의 검색 매개변수로 유지돼요.
// 예: /recipes?q=샐러드&difficulty=easy&vegetable=carrot&page=2

import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import {
  RecipeFilters,
  recipeListHref,
} from "@/components/recipes/RecipeFilters";
import { routes } from "@/lib/routes";
import { parseRecipeFilters } from "@/schemas/recipe";
import { getRecipes, getRecipeVegetableOptions } from "@/services/recipes";
import Link from "next/link";
import { RECIPE_DIFFICULTY_LABELS } from "@/types/recipe";

// 한 쪽에 보여 줄 레시피 수 (2열·3열 모두 줄이 딱 맞아요)
const PAGE_SIZE = 18;

export const metadata: Metadata = {
  title: "레시피",
  description: "못난이 농산물로 만드는 간단한 집밥 레시피를 찾아보세요.",
};

export default function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="container-page pb-10 pt-6 md:pb-16 md:pt-10">
      <h1 className="sr-only">못난이 채소 레시피</h1>

      <Suspense fallback={<ResultsSkeleton />}>
        <RecipeResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RecipeResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseRecipeFilters(params);
  const [recipes, vegetables] = await Promise.all([
    getRecipes(filters),
    getRecipeVegetableOptions(),
  ]);

  const vegetableName = vegetables.find(
    (vegetable) => vegetable.id === filters.vegetable,
  )?.name;
  const conditions = [
    filters.q ? `검색어 “${filters.q}”` : null,
    filters.difficulty
      ? `난이도 ${RECIPE_DIFFICULTY_LABELS[filters.difficulty]}`
      : null,
    vegetableName ? `채소 ${vegetableName}` : null,
  ].filter(Boolean);
  // 쪽 번호: 잘못된 값은 1쪽, 마지막 쪽보다 크면 마지막 쪽
  const pages = Math.max(1, Math.ceil(recipes.length / PAGE_SIZE));
  const rawPage = Number(
    Array.isArray(params.page) ? params.page[0] : params.page,
  );
  const page = Number.isInteger(rawPage)
    ? Math.min(Math.max(rawPage, 1), pages)
    : 1;
  const visible = recipes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstShown = Math.max(1, page - 2);
  const pageNumbers = Array.from(
    { length: Math.min(pages, 5) },
    (_, index) => Math.min(firstShown, Math.max(1, pages - 4)) + index,
  );

  return (
    <>
      <div>
        <RecipeFilters filters={filters} vegetables={vegetables} />
      </div>

      {/* 결과 문구(왼쪽)와 검색·필터 초기화(오른쪽)를 한 줄에 */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 md:mt-8">
        <p role="status" className="font-bold" data-testid="result-count">
          {conditions.length > 0 ? `${conditions.join(" · ")} — ` : ""}레시피{" "}
          {recipes.length}개
          {pages > 1 && (
            <span className="ml-2 text-sm font-normal text-ink-muted">
              ({page} / {pages}쪽)
            </span>
          )}
        </p>
        {conditions.length > 0 && (
          <Link
            href={routes.recipes}
            className="inline-flex min-h-12 items-center font-bold text-brand-dark underline underline-offset-4"
          >
            검색·필터 초기화
          </Link>
        )}
      </div>

      {recipes.length > 0 ? (
        <>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <nav
              aria-label="레시피 페이지"
              className="mt-10 flex flex-wrap items-center justify-center gap-2"
            >
              {page > 1 && (
                <Link
                  href={recipeListHref(filters, page - 1)}
                  className="btn btn-secondary"
                >
                  이전
                </Link>
              )}
              {pageNumbers.map((number) => (
                <Link
                  key={number}
                  href={recipeListHref(filters, number)}
                  aria-current={number === page ? "page" : undefined}
                  aria-label={`${number}페이지`}
                  className={`btn min-w-12 ${number === page ? "btn-primary" : "btn-secondary"}`}
                >
                  {number}
                </Link>
              ))}
              {page < pages && (
                <Link
                  href={recipeListHref(filters, page + 1)}
                  className="btn btn-secondary"
                >
                  다음
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <div
          className="card mt-4 px-6 py-12 text-center"
          data-testid="empty-state"
        >
          <h2 className="text-xl font-extrabold">
            조건에 맞는 레시피가 없어요
          </h2>
          <p className="mt-2 text-ink-muted">
            검색어를 줄이거나 다른 채소를 골라 보세요. 필터를 초기화하면 전체
            레시피를 볼 수 있어요.
          </p>
          <Link href={routes.recipes} className="btn btn-primary mt-6">
            검색·필터 초기화
          </Link>
        </div>
      )}
    </>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-8" aria-busy="true">
      <p className="text-ink-muted">레시피를 불러오는 중이에요…</p>
      <div
        className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-hidden="true"
      >
        {[0, 1, 2].map((item) => (
          <div key={item} className="card h-80 animate-pulse bg-sand/60" />
        ))}
      </div>
    </div>
  );
}
