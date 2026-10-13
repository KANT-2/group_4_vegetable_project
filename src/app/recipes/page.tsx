// 레시피 목록 /recipes (A 담당)
// 검색(q)과 채소 필터(vegetable)는 주소의 검색 매개변수로 유지돼요.
// 예: /recipes?q=샐러드&vegetable=carrot

import type { Metadata } from "next";
import { Suspense } from "react";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeFilters } from "@/components/recipes/RecipeFilters";
import { routes } from "@/lib/routes";
import { parseRecipeFilters } from "@/schemas/recipe";
import { getRecipes, getRecipeVegetableOptions } from "@/services/recipes";
import Link from "next/link";

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
  const filters = parseRecipeFilters(await searchParams);
  const [recipes, vegetables] = await Promise.all([
    getRecipes(filters),
    getRecipeVegetableOptions(),
  ]);

  const vegetableName = vegetables.find(
    (vegetable) => vegetable.id === filters.vegetable,
  )?.name;
  const conditions = [
    filters.q ? `검색어 “${filters.q}”` : null,
    vegetableName ? `채소 ${vegetableName}` : null,
  ].filter(Boolean);

  return (
    <>
      <div>
        <RecipeFilters filters={filters} vegetables={vegetables} />
      </div>

      <p
        role="status"
        className="mt-5 font-bold md:mt-8"
        data-testid="result-count"
      >
        {conditions.length > 0 ? `${conditions.join(" · ")} — ` : ""}레시피{" "}
        {recipes.length}개
      </p>

      {recipes.length > 0 ? (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
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
