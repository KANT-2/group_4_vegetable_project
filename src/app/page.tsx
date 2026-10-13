// 메인 화면 / (A 담당)
// v2 시안(마켓컬리 기준):
//   화면 너비 사진 배너 → [진열 줄 × 여러 개, 사이사이 띠 배너] → 레시피 → 농가 이야기
// 진열 줄은 가운데 제목 + 4개씩 옆으로 넘기는 상품 카드예요. (src/components/common/HomeShelf.tsx)
// 서비스 가치·이용 흐름 같은 긴 소개는 /story 의 "우리 이야기"에 있어요.
// 상품·채소 화면(B)이 아직 없으면 그쪽으로 가는 링크는 그리지 않아요. (src/lib/routes.ts)

import Link from "next/link";
import {
  HomeBanner,
  type HomeBannerSlide,
} from "@/components/common/HomeBanner";
import { HomeShelf } from "@/components/common/HomeShelf";
import { MockDataNotice } from "@/components/common/MockDataNotice";
import { ProductPreviewCard } from "@/components/common/ProductPreviewCard";
import { SafeImage } from "@/components/common/SafeImage";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { COLLECTIONS, type CollectionKey } from "@/lib/catalog";
import { pickRecommended, rankProducts } from "@/lib/product-ranking";
import { routes } from "@/lib/routes";
import { getProductList } from "@/services/products";
import { getRecipes } from "@/services/recipes";
import { getFarmStories } from "@/services/showcase";
import type { Product } from "@/types/product";

const SHELF_SIZE = 8; // 한 줄에 4개씩 보이고, 넘기면 4개 더

const HOME_RECIPE_COUNT = 8;

// 상품·농가 정보는 5분마다 새로 확인해요.
export const revalidate = 300;

function ProductItems({ products }: { products: Product[] }) {
  return products.map((product) => (
    <li key={product.id}>
      <ProductPreviewCard
        name={product.name}
        imageUrl={product.imageUrl}
        vegetableId={product.vegetableId}
        unit={product.unit}
        price={product.price}
        originalPrice={product.originalPrice}
        uglyReason={product.uglyReason}
        eyebrow={product.farmName}
        href={routes.product(product.id)}
        productId={product.id}
        reviewCount={product.reviewCount}
      />
    </li>
  ));
}

// 진열 줄 사이의 가로로 긴 띠 배너 (마켓컬리 1050×140)
function StripBanner({
  href,
  eyebrow,
  title,
  imageUrl,
}: {
  href: string;
  eyebrow: string;
  title: string;
  imageUrl?: string;
}) {
  return (
    <div className="container-page pt-10 md:pt-14">
      <Link
        href={href}
        className="group flex h-28 items-stretch overflow-hidden bg-sand md:h-[8.75rem]"
      >
        <span className="flex flex-1 flex-col justify-center px-5 md:px-14">
          <span className="text-sm text-ink-muted md:text-base">{eyebrow}</span>
          <span className="mt-1 text-lg font-bold leading-snug group-hover:text-brand md:text-[1.625rem]">
            {title} <span aria-hidden="true">›</span>
          </span>
        </span>
        <SafeImage
          src={imageUrl}
          alt=""
          className="w-2/5 object-cover md:w-[22rem]"
        />
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const [catalogProducts, farms, recipes] = await Promise.all([
    getProductList({ sort: "recommended" }),
    getFarmStories(),
    getRecipes(),
  ]);
  const active = catalogProducts.filter((p) => p.isActive);
  const list = routes.productList;
  const collectionHref = (key: CollectionKey) =>
    list ? `${list}?collection=${key}` : null;

  // 진열 줄: 할인 → 제철 → (띠 배너) → 후기 많은 순 → 1인 가구 → 대용량
  // 앞 줄에 나온 상품은 다음 줄에서 빼서, 줄마다 다른 상품이 보이게 해요.
  const shown = new Set<string>();
  const take = (products: Product[]) => {
    const picked = products
      .filter((p) => !shown.has(p.id))
      .slice(0, SHELF_SIZE);
    picked.forEach((p) => shown.add(p.id));
    return picked;
  };
  const discounted = take(rankProducts(active, "discount_desc"));
  const seasonal = take(
    rankProducts(active.filter(COLLECTIONS.seasonal.match), "seasonal"),
  );
  const popular = take(rankProducts(active, "reviews"));
  const single = take(
    pickRecommended(active.filter(COLLECTIONS.single.match), active.length),
  );
  const bulk = take(
    pickRecommended(active.filter(COLLECTIONS.bulk.match), active.length),
  );

  const recipeImage = recipes.find((recipe) => recipe.imageUrl)?.imageUrl;
  const slides: HomeBannerSlide[] = [
    {
      id: "openrun-coupon",
      href: "/promotions/openrun-coupon",
      layout: "artwork",
      imageUrl: "/images/home-banners/01-openrun.png",
      eyebrow: "오픈런 쿠폰",
      title: "하루의 시작을\n알뜰하게!",
      sub: "오늘의 장보기에 작은 혜택을 더해요",
      cta: "쿠폰 받기",
    },
    {
      id: "first-box",
      href: "/promotions/first-box",
      layout: "artwork",
      imageUrl: "/images/home-banners/02-firstbox.png",
      eyebrow: "첫 채소박스 혜택",
      title: "제철의 맛을\n가볍게 시작해요",
      sub: "처음 만나는 못난이 채소, 더 반가운 혜택",
      cta: "첫 구매 혜택 보기",
    },
    {
      id: "fresh-delivery",
      href: "/promotions/fresh-delivery",
      layout: "artwork",
      imageUrl: "/images/home-banners/03-freshdelivery.png",
      eyebrow: "신선 배송",
      title: "농장에서 식탁까지\n신선함을 빠르게",
      sub: "제철 채소의 좋은 맛을 그대로 전해요",
      cta: "배송 안내 보기",
    },
    {
      id: "kimjang-coupon",
      href: "/promotions/kimjang-coupon",
      layout: "artwork",
      imageUrl: "/images/home-banners/04-kimjangcoupon.png",
      eyebrow: "김장철 추가 할인",
      title: "김장 준비는 넉넉하게\n추가 할인 쿠폰으로",
      sub: "배추부터 무까지, 김장 재료를 알뜰하게",
      cta: "김장 쿠폰 받기",
    },
    {
      id: "family-kimjang",
      href: "/promotions/family-kimjang",
      layout: "artwork",
      imageUrl: "/images/home-banners/05-familykimjang.png",
      eyebrow: "가족과 함께하는 농가 체험",
      title: "아이와 함께하는\n우리 가족 첫 김장",
      sub: "함께 버무리고, 함께 웃는 특별한 하루",
      cta: "김장 체험 알아보기",
    },
  ];

  return (
    <>
      <h1 className="sr-only">못난이마켓 · 모양만 다른 맛있는 농산물</h1>

      {/* 1. 화면 너비 사진 배너 */}
      <HomeBanner slides={slides} intervalMs={3000} />

      <div className="container-page [&:not(:empty)]:mt-6">
        <MockDataNotice subject="상품·농가" />
      </div>

      {/* 2. 진열 줄 */}
      {discounted.length > 0 && (
        <HomeShelf
          id="shelf-discount"
          eyebrow="BEST PRICE"
          title="지금 가장 많이 할인해요"
          sub="모양만 다를 뿐, 맛은 그대로예요"
          href={list ? `${list}?sort=discount_desc` : null}
        >
          <ProductItems products={discounted} />
        </HomeShelf>
      )}

      {seasonal.length > 0 && (
        <HomeShelf
          id="shelf-seasonal"
          eyebrow={COLLECTIONS.seasonal.eyebrow}
          title={COLLECTIONS.seasonal.title}
          sub={COLLECTIONS.seasonal.description}
          href={collectionHref("seasonal")}
        >
          <ProductItems products={seasonal} />
        </HomeShelf>
      )}

      <StripBanner
        href={`${routes.story}#reasons`}
        eyebrow="못난이마켓 선별 기준"
        title="맛과 신선도는 그대로, 모양만 달라요"
        imageUrl={seasonal[0]?.imageUrl ?? discounted[0]?.imageUrl}
      />

      {popular.length > 0 && (
        <HomeShelf
          id="shelf-popular"
          eyebrow="BEST REVIEW"
          title="후기가 많은 인기 상품"
          sub="먼저 산 분들이 많이 고른 못난이"
          href={list ? `${list}?sort=reviews` : null}
        >
          <ProductItems products={popular} />
        </HomeShelf>
      )}

      {single.length > 0 && (
        <HomeShelf
          id="shelf-single"
          eyebrow={COLLECTIONS.single.eyebrow}
          title={COLLECTIONS.single.title}
          sub={COLLECTIONS.single.description}
          href={collectionHref("single")}
        >
          <ProductItems products={single} />
        </HomeShelf>
      )}

      {bulk.length > 0 && (
        <HomeShelf
          id="shelf-bulk"
          eyebrow={COLLECTIONS.bulk.eyebrow}
          title={COLLECTIONS.bulk.title}
          sub={COLLECTIONS.bulk.description}
          href={collectionHref("bulk")}
        >
          <ProductItems products={bulk} />
        </HomeShelf>
      )}

      {/* 4. 레시피 */}
      <StripBanner
        href={routes.recipes}
        eyebrow="못난이 채소로 만드는 쉬운 집밥"
        title={`레시피 ${recipes.length}가지 보러 가기`}
        imageUrl={recipeImage}
      />
      {recipes.length > 0 && (
        <HomeShelf
          id="shelf-recipes"
          eyebrow="RECIPE"
          title="오늘은 뭘 해 먹을까요?"
          sub="장바구니에 담은 채소로 바로 만들어요"
          href={routes.recipes}
        >
          {recipes.slice(0, HOME_RECIPE_COUNT).map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </HomeShelf>
      )}

      {/* 5. 농가 이야기 */}
      {farms.length > 0 && (
        <HomeShelf
          id="shelf-farms"
          eyebrow="FARM STORY"
          title="농가 이야기"
          sub="농산물을 키우는 사람들의 하루"
          href={routes.story}
        >
          {farms.map((farm) => (
            <li key={farm.farmName}>
              <Link href={routes.farm(farm.farmName)} className="group block">
                <span className="block overflow-hidden rounded-[0.25rem] bg-sand">
                  <SafeImage
                    src={farm.products[0].imageUrl}
                    alt={`${farm.farmName}의 ${farm.products[0].name} 사진`}
                    className="aspect-[249/320] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="mt-3 block text-base font-bold group-hover:text-brand">
                  {farm.farmName}
                </span>
                {farm.farmRegion && (
                  <span className="block text-sm text-ink-muted">
                    {farm.farmRegion}
                  </span>
                )}
                {farm.story && (
                  <span className="mt-1 line-clamp-2 block text-sm leading-normal">
                    {farm.story}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </HomeShelf>
      )}

      <div className="pb-16 md:pb-24" />
    </>
  );
}
