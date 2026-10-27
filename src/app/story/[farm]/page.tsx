// 농가 상세 /story/[farm] (A 담당, v2 시안 · 마켓컬리 상품 상세 기준)
// 구성: 사진·소개·한눈에 보기 → 탭(판매 상품 | 농가 위치 | 요리) → 판매 상품 → 구글 지도 → 요리 → 다른 농가
// 농가·상품 정보는 상품 데이터(B)에서 농가 이름으로 묶어 가져와요. (services/showcase.ts)
// 등록한 상세 주소·좌표가 있으면 사용하고, 기존 예시 농가는 지역 위치로 구분해 표시해요.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeShelf } from "@/components/common/HomeShelf";
import { ProductPreviewCard } from "@/components/common/ProductPreviewCard";
import { SafeImage } from "@/components/common/SafeImage";
import { FarmManagedDetails } from "@/components/common/FarmManagedDetails";
import { FarmManagedGallery } from "@/components/common/FarmManagedGallery";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { getFarmStoryDetail } from "@/data/farm-stories";
import { getFarmPhoto } from "@/lib/farm-photo";
import { routes } from "@/lib/routes";
import { getProductList } from "@/services/products";
import { getRecipesByVegetable } from "@/services/recipes";
import { getFarmStories } from "@/services/showcase";

// 상품·농가 정보는 5분마다 새로 확인해요.
export const revalidate = 300;

async function findFarm(param: string) {
  const name = decodeURIComponent(param);
  const farms = await getFarmStories();
  return { farm: farms.find((f) => f.farmName === name), farms };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ farm: string }>;
}): Promise<Metadata> {
  const { farm } = await findFarm((await params).farm);
  if (!farm) return { title: "농가를 찾을 수 없어요" };
  return {
    title: `${farm.farmName} · 농가 이야기`,
    description:
      getFarmStoryDetail(farm.farmName)?.headline ??
      farm.story ??
      `${farm.farmName}의 못난이 농산물을 만나보세요.`,
  };
}

const TABS = [
  { id: "products", label: "판매 상품" },
  { id: "story", label: "농가 이야기" },
  { id: "location", label: "농가 위치" },
  { id: "recipes", label: "이 채소로 만드는 요리" },
];

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ farm: string }>;
}) {
  const { farm, farms } = await findFarm((await params).farm);
  if (!farm) notFound();

  const [catalog, recipeLists] = await Promise.all([
    getProductList({ sort: "recommended" }),
    Promise.all(
      [...new Set(farm.products.map((p) => p.vegetableId))].map((id) =>
        getRecipesByVegetable(id),
      ),
    ),
  ]);
  const products = catalog.filter(
    (p) => p.isActive && (p.farmName === farm.farmName || p.farmName === farm.id),
  );
  const recipes = [
    ...new Map(recipeLists.flat().map((r) => [r.id, r])).values(),
  ];
  const photo = getFarmPhoto(farm);
  const detail = farm.detail ?? getFarmStoryDetail(farm.farmName);
  const crops = farm.crops ?? [...new Set(farm.products.map((p) => p.vegetableName))];
  const reviewTotal = products.reduce((sum, p) => sum + p.reviewCount, 0);
  const others = farms.filter((f) => f.farmName !== farm.farmName);

  const region = farm.farmRegion;

  return (
    <>
      {/* 위치 안내 (빵부스러기) */}
      <nav aria-label="현재 위치" className="container-page pt-5 text-sm">
        <ol className="flex flex-wrap items-center gap-1 text-ink-muted">
          <li>
            <Link href={routes.home} className="hover:text-brand">
              홈
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link href={routes.story} className="hover:text-brand">
              농가 이야기
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-ink">
            {farm.farmName}
          </li>
        </ol>
      </nav>

      {/* 1. 사진 · 소개 · 한눈에 보기 */}
      <section className="container-page grid gap-6 pt-5 md:grid-cols-[minmax(0,26rem)_1fr] md:gap-12 md:pt-8">
        <div className="overflow-hidden rounded-[0.25rem] bg-sand">
          <FarmManagedGallery
            farmId={farm.farmName}
            name={farm.farmName}
            fallback={photo.imageUrl}
          />
        </div>
        <div className="flex flex-col">
          {region && (
            <p className="text-sm font-bold text-brand">📍 {region}</p>
          )}
          <h1 className="mt-1 text-[1.75rem] font-bold leading-tight md:text-[2rem]">
            {farm.farmName}
          </h1>
          {(detail?.headline ?? farm.story) && (
            <p className="mt-3 text-base leading-relaxed text-ink-muted md:text-lg">
              {detail?.headline ?? farm.story}
            </p>
          )}

          <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
            {[
              ["지역", region ?? "정보 준비 중"],
              ["주요 농산물", crops.join(" · ")],
              ["판매 상품", `${products.length}개`],
              ["상품 후기", `${reviewTotal.toLocaleString("ko-KR")}개`],
            ].map(([term, value]) => (
              <div key={term} className="grid grid-cols-[7rem_1fr] py-3.5">
                <dt className="text-ink-muted">{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <a href="#products" className="btn btn-primary rounded-[0.25rem]">
              농산물 보러 가기
            </a>
            <a href="#location" className="btn btn-secondary rounded-[0.25rem]">
              지도에서 위치 보기
            </a>
          </div>
        </div>
      </section>

      <div className="container-page mt-6">
      </div>

      {/* 2. 탭: 마켓컬리 상품 상세처럼 아래 구역으로 이동해요 (스크롤해도 위에 붙어 있어요) */}
      <nav
        aria-label="농가 정보 바로가기"
        className="sticky top-0 z-20 mt-10 border-b border-line bg-surface"
      >
        <ul className="container-page grid grid-cols-4">
          {TABS.map((tab) => (
            <li key={tab.id}>
              <a
                href={`#${tab.id}`}
                className="flex min-h-14 items-center justify-center border-x border-t border-transparent text-center text-sm font-medium hover:text-brand md:text-base"
              >
                {tab.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* 3. 판매 상품 */}
      <section
        id="products"
        aria-labelledby="products-title"
        className="container-page scroll-mt-16 pt-10"
      >
        <h2 id="products-title" className="text-xl font-bold md:text-2xl">
          {farm.farmName}의 못난이 농산물{" "}
          <span className="text-brand">{products.length}</span>
        </h2>
        {products.length > 0 ? (
          <ul className="mt-5 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-[18px] lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductPreviewCard
                  name={product.name}
                  imageUrl={product.imageUrl}
                  vegetableId={product.vegetableId}
                  unit={product.unit}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  uglyReason={product.uglyReason}
                  href={routes.product(product.id)}
                  productId={product.id}
        stock={product.stock}
                  reviewCount={product.reviewCount}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 bg-sand px-6 py-10 text-center text-ink-muted">
            지금 판매 중인 농산물이 없어요.
          </p>
        )}
      </section>

      {/* 4. 농가 이야기: 땅 · 키우는 방식 · 모양이 다른 이유 · 먹는 법 */}
      <FarmManagedDetails
        farmId={farm.farmName}
        name={farm.farmName}
        region={region}
        detail={detail}
      />

      {/* 6. 이 채소로 만드는 요리 */}
      <section
        id="recipes"
        aria-labelledby="recipes-title"
        className="container-page scroll-mt-16 pt-14"
      >
        <h2 id="recipes-title" className="text-xl font-bold md:text-2xl">
          이 농가의 채소로 만드는 요리
        </h2>
        {recipes.length > 0 ? (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recipes.slice(0, 8).map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 bg-sand px-6 py-10 text-center text-ink-muted">
            이 농산물로 만드는 레시피를 준비하고 있어요.
          </p>
        )}
      </section>

      {/* 7. 다른 농가 이야기 */}
      {others.length > 0 && (
        <HomeShelf
          id="other-farms"
          eyebrow="MORE FARMS"
          title="다른 농가 이야기"
          sub="다른 지역 농가도 만나보세요"
          href={routes.story}
        >
          {others.map((other) => {
            const otherPhoto = getFarmPhoto(other);
            return (
              <li key={other.farmName}>
                <Link
                  href={routes.farm(other.farmName)}
                  className="group block"
                >
                  <span className="block overflow-hidden rounded-[0.25rem] bg-sand">
                    <SafeImage
                      src={otherPhoto.imageUrl}
                      alt={otherPhoto.alt}
                      className={`aspect-[249/320] w-full object-cover transition-transform duration-300 group-hover:scale-105 ${otherPhoto.position}`}
                    />
                  </span>
                  <span className="mt-3 block font-bold group-hover:text-brand">
                    {other.farmName}
                  </span>
                  {other.farmRegion && (
                    <span className="block text-sm text-ink-muted">
                      {other.farmRegion}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </HomeShelf>
      )}
      <div className="pb-16 md:pb-24" />
    </>
  );
}
