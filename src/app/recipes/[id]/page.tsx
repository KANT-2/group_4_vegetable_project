// 레시피 상세 /recipes/[id] (A 담당)
// 없는 id 는 404 화면(src/app/not-found.tsx)으로 보내요.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/common/Icons";
import { ProductPreviewCard } from "@/components/common/ProductPreviewCard";
import { SafeImage } from "@/components/common/SafeImage";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeImage } from "@/components/recipes/RecipeImage";
import { RecipeIngredients } from "@/components/recipes/RecipeIngredients";
import { RecipeMeta } from "@/components/recipes/RecipeMeta";
import { RecipeSteps } from "@/components/recipes/RecipeSteps";
import { routes } from "@/lib/routes";
import { recipeIdSchema } from "@/schemas/recipe";
import { getRecipe, getRecipeIds } from "@/services/recipes";

// 등록된 레시피는 빌드 때 미리 만들어 두고, 5분마다 새로 확인해요.
export const revalidate = 300;

export async function generateStaticParams() {
  const ids = await getRecipeIds();
  return ids.map((id) => ({ id }));
}

async function loadRecipe(params: Promise<{ id: string }>) {
  const { id } = await params;
  const parsed = recipeIdSchema.safeParse(id);
  if (!parsed.success) return null;
  return getRecipe(parsed.data);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const recipe = await loadRecipe(params);
  if (!recipe) return { title: "레시피를 찾을 수 없어요" };
  return { title: recipe.name, description: recipe.description };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const recipe = await loadRecipe(params);
  if (!recipe) notFound();

  return (
    <div className="container-page py-6 md:py-10">
      <nav aria-label="현재 위치" className="text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li>
            <Link
              href={routes.home}
              className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:underline"
            >
              홈
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link
              href={routes.recipes}
              className="inline-flex min-h-11 min-w-11 items-center justify-center px-1 hover:underline"
            >
              레시피
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-bold text-ink">
            {recipe.name}
          </li>
        </ol>
      </nav>

      <div className="mt-4 grid gap-6 md:grid-cols-2 md:items-center md:gap-10">
        <div
          className={recipe.additionalImageUrl ? "grid grid-cols-2 gap-3" : ""}
        >
          <RecipeImage
            recipe={recipe}
            priority
            className={
              recipe.additionalImageUrl
                ? "aspect-[3/4] w-full rounded-card object-cover"
                : "aspect-[4/3] w-full rounded-card object-cover"
            }
          />
          {recipe.additionalImageUrl && (
            <SafeImage
              src={recipe.additionalImageUrl}
              alt={`${recipe.name} 두 번째 사진`}
              className="aspect-[3/4] w-full rounded-card object-cover"
            />
          )}
        </div>
        <div className="space-y-5">
          <h1 className="page-title">{recipe.name}</h1>
          <RecipeMeta recipe={recipe} size="lg" />
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-brand-dark underline"
            >
              {recipe.sourceName} 원문 보기
            </a>
          )}
          <Link href={routes.recipes} className="btn btn-secondary">
            <ArrowLeftIcon width={18} height={18} />
            목록으로 돌아가기
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[22rem_1fr] lg:gap-14">
        <section
          aria-labelledby="ingredients-title"
          className="card self-start p-5 sm:p-6"
        >
          <h2 id="ingredients-title" className="section-title">
            재료
          </h2>
          {recipe.servings && (
            <p className="mt-1 text-sm text-ink-muted">
              {recipe.servings}인분 기준
            </p>
          )}
          <div className="mt-3">
            <RecipeIngredients ingredients={recipe.ingredients} />
          </div>
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title" className="section-title">
            조리 순서
          </h2>
          <div className="mt-5">
            <RecipeSteps steps={recipe.steps} />
          </div>
        </section>
      </div>

      {recipe.products.length > 0 && (
        <section aria-labelledby="products-title" className="mt-14">
          <h2 id="products-title" className="section-title">
            이 요리에 쓰는 못난이 농산물
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {recipe.products.map((product) => (
              <li key={product.id}>
                <ProductPreviewCard
                  name={product.name}
                  imageUrl={product.imageUrl}
                  unit={product.unit}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  uglyReason={product.uglyReason}
                  href={routes.product(product.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {recipe.relatedRecipes.length > 0 && (
        <section aria-labelledby="related-title" className="mt-14">
          <h2 id="related-title" className="section-title">
            같은 채소로 만드는 다른 요리
          </h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipe.relatedRecipes.slice(0, 3).map((related) => (
              <li key={related.id}>
                <RecipeCard recipe={related} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 text-center">
        <Link href={routes.recipes} className="btn btn-secondary">
          <ArrowLeftIcon width={18} height={18} />
          레시피 목록으로
        </Link>
      </div>
    </div>
  );
}
