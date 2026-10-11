// 메인 화면 / (A 담당)
// 구성: 짧은 소개 → 추천 농산물(첫 화면에 보이도록) → 채소로 찾기 → 추천 레시피 → 농가 이야기 → 우리 이야기 안내
// 서비스 가치·이용 흐름 같은 긴 소개는 /story 의 "우리 이야기"로 옮겼어요. 휴대폰 첫 화면에서 상품이 먼저 보이게 하기 위해서예요.
// 상품·채소 화면(B)이 아직 없으면 그쪽으로 가는 링크는 그리지 않아요. (src/lib/routes.ts)

import Link from "next/link";
import { ArrowRightIcon } from "@/components/common/Icons";
import { MockDataNotice } from "@/components/common/MockDataNotice";
import { ProductPreviewCard } from "@/components/common/ProductPreviewCard";
import { SafeImage } from "@/components/common/SafeImage";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { routes } from "@/lib/routes";
import { getRecipes, getRecipeVegetableOptions } from "@/services/recipes";
import { getFarmStories, getFeaturedProducts } from "@/services/showcase";

const HOME_RECIPE_COUNT = 3;
const HOME_FARM_COUNT = 3;

// 상품·농가 정보는 5분마다 새로 확인해요.
export const revalidate = 300;

export default async function HomePage() {
  const [featured, farms, recipes, vegetables] = await Promise.all([
    getFeaturedProducts(),
    getFarmStories(),
    getRecipes(),
    getRecipeVegetableOptions(),
  ]);

  const hasVegetablePage = vegetables.some((vegetable) =>
    routes.vegetable(vegetable.id),
  );

  return (
    <>
      {/* 1. 짧은 소개: 모바일에서는 이미지를 빼서 바로 아래 상품이 첫 화면에 보여요. */}
      <section className="container-page pt-4 md:pt-8">
        <div className="grid overflow-hidden rounded-[1.5rem] bg-sand md:grid-cols-[1.1fr_1fr] md:items-center md:rounded-[2rem]">
          <div className="p-5 sm:p-8 md:p-10">
            <p className="chip hidden bg-surface text-brand-dark sm:inline-flex">
              B급이라 더 착한 가격
            </p>
            <h1 className="text-[1.75rem] font-black leading-tight sm:mt-3 sm:text-4xl md:text-5xl">
              못생겨도 맛은 <span className="text-brand">1등급</span>입니다
            </h1>
            <p className="mt-2 max-w-md text-ink-muted md:mt-3 md:text-lg">
              모양이 달라 버려질 뻔한 농산물과 농가 이야기, 그 채소로 만드는
              요리를 만나보세요.
            </p>
            <div className="mt-4 flex gap-3 md:mt-6">
              {routes.productList ? (
                <>
                  <Link
                    href={routes.productList}
                    className="btn btn-primary flex-1 sm:flex-none"
                  >
                    상품 보기
                    <ArrowRightIcon
                      width={18}
                      height={18}
                      className="hidden sm:block"
                    />
                  </Link>
                  <Link
                    href={routes.recipes}
                    className="btn btn-secondary flex-1 sm:flex-none"
                  >
                    레시피 보기
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={routes.recipes}
                    className="btn btn-primary flex-1 sm:flex-none"
                  >
                    레시피 보기
                    <ArrowRightIcon
                      width={18}
                      height={18}
                      className="hidden sm:block"
                    />
                  </Link>
                  <Link
                    href={routes.story}
                    className="btn btn-secondary flex-1 sm:flex-none"
                  >
                    농가 이야기
                  </Link>
                </>
              )}
            </div>
          </div>
          <SafeImage
            src="/images/hero.jpg"
            alt="바구니에 담긴 여러 가지 채소와 과일"
            className="hidden size-full object-cover md:block md:min-h-[17rem]"
          />
        </div>
      </section>

      {/* 2. 개발용 예시 안내 (Mock 모드에서만 보여요) */}
      <div className="container-page mt-4">
        <MockDataNotice subject="상품·농가" />
      </div>

      {/* 3. 추천 농산물 */}
      {featured.length > 0 && (
        <section
          aria-labelledby="featured-title"
          className="container-page pb-10 pt-6 md:pb-16 md:pt-10"
        >
          <div className="flex items-end justify-between gap-4">
            <h2 id="featured-title" className="section-title">
              추천 못난이 농산물
            </h2>
            {routes.productList && (
              <Link
                href={routes.productList}
                className="inline-flex min-h-12 items-center font-bold text-brand-dark"
              >
                전체 보기 →
              </Link>
            )}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {featured.map((product) => (
              <li key={product.id}>
                <ProductPreviewCard
                  name={product.name}
                  imageUrl={product.imageUrl}
                  unit={product.unit}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  uglyReason={product.uglyReason}
                  eyebrow={product.farmName}
                  href={routes.product(product.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. 채소로 찾기 */}
      {vegetables.length > 0 && (
        <section aria-labelledby="vegetables-title" className="bg-sand/50">
          <div className="container-page section">
            <h2 id="vegetables-title" className="section-title">
              {hasVegetablePage
                ? "어떤 채소를 찾으세요?"
                : "채소로 레시피 찾기"}
            </h2>
            <ul className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-6">
              {vegetables.map((vegetable) => (
                <li key={vegetable.id}>
                  <Link
                    href={
                      routes.vegetable(vegetable.id) ??
                      routes.recipesByVegetable(vegetable.id)
                    }
                    className="group flex min-h-12 flex-col items-center gap-2 text-center"
                  >
                    <SafeImage
                      src={vegetable.imageUrl}
                      alt=""
                      placeholderText=""
                      className="size-20 rounded-full border border-line object-cover sm:size-24"
                    />
                    <span className="font-bold group-hover:text-brand">
                      {vegetable.name}
                    </span>
                    <span className="sr-only">
                      {routes.vegetable(vegetable.id)
                        ? "채소 정보 보기"
                        : "레시피 보기"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 5. 추천 레시피 */}
      {recipes.length > 0 && (
        <section aria-labelledby="recipes-title">
          <div className="container-page section">
            <div className="flex items-end justify-between gap-4">
              <h2 id="recipes-title" className="section-title">
                오늘은 뭘 해 먹을까요?
              </h2>
              <Link
                href={routes.recipes}
                className="inline-flex min-h-12 items-center font-bold text-brand-dark"
              >
                전체 레시피 →
              </Link>
            </div>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.slice(0, HOME_RECIPE_COUNT).map((recipe) => (
                <li key={recipe.id}>
                  <RecipeCard recipe={recipe} />
                </li>
              ))}
            </ul>
            <div className="mt-8 text-center">
              <Link href={routes.recipes} className="btn btn-primary">
                전체 레시피 보기
                <ArrowRightIcon width={18} height={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 6. 농가 이야기 */}
      {farms.length > 0 && (
        <section aria-labelledby="farms-title" className="bg-sand/50">
          <div className="container-page section">
            <div className="flex items-end justify-between gap-4">
              <h2 id="farms-title" className="section-title">
                농가 이야기
              </h2>
              <Link
                href={routes.story}
                className="inline-flex min-h-12 items-center font-bold text-brand-dark"
              >
                더 보기 →
              </Link>
            </div>
            <ul className="mt-6 grid gap-5 md:grid-cols-3">
              {farms.slice(0, HOME_FARM_COUNT).map((farm) => (
                <li key={farm.farmName}>
                  <Link
                    href={routes.story}
                    className="card group flex h-full flex-col overflow-hidden"
                  >
                    <SafeImage
                      src={farm.products[0].imageUrl}
                      alt={`${farm.farmName}의 ${farm.products[0].name} 사진`}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <div className="flex-1 space-y-1 p-5">
                      <h3 className="text-lg font-extrabold group-hover:text-brand">
                        {farm.farmName}
                      </h3>
                      {farm.farmRegion && (
                        <p className="text-sm text-ink-muted">
                          {farm.farmRegion}
                        </p>
                      )}
                      {farm.story && (
                        <p className="line-clamp-2 pt-1">{farm.story}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 7. 우리 이야기 안내: 서비스 가치·이용 흐름은 /story 에 있어요. */}
      <section
        aria-labelledby="about-title"
        className="container-page pb-12 md:pb-16"
      >
        <div className="card flex flex-col gap-4 bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <h2
              id="about-title"
              className="text-lg font-extrabold text-brand-dark md:text-xl"
            >
              못난이마켓은 어떤 서비스일까요?
            </h2>
            <p className="mt-1 text-ink-muted">
              농가는 추가 수익, 소비자는 합리적인 가격, 지구는 조금 더 가볍게.
            </p>
          </div>
          <Link
            href={`${routes.story}#about`}
            className="btn btn-primary shrink-0"
          >
            우리 이야기 보기
            <ArrowRightIcon width={18} height={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
