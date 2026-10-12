import farmPhotos from "@/data/farm-photo-assets.json";
import { getFarmPhoto } from "@/lib/farm-photo";
// 농가 이야기 /story (A 담당)
// 농가·농산물 정보는 상품 데이터(B)에서 가져와 농가별로 묶어 보여줘요. (services/showcase.ts)
// 실제 농가 자료가 아닌 개발용 예시일 때는 화면에 그렇게 표시돼요.

import type { Metadata } from "next";
import Link from "next/link";
import {
  HomeBanner,
  type HomeBannerSlide,
} from "@/components/common/HomeBanner";
import { ArrowRightIcon } from "@/components/common/Icons";
import { MockDataNotice } from "@/components/common/MockDataNotice";
import { SafeImage } from "@/components/common/SafeImage";
import { routes } from "@/lib/routes";
import { getProductList } from "@/services/products";
import { getFarmStories } from "@/services/showcase";
import { UGLY_REASON_LABELS, type UglyReason } from "@/types/product";
import type { FarmStory } from "@/types/showcase";

export const metadata: Metadata = {
  title: "농가 이야기",
  description:
    "모양과 크기가 제각각인 농산물이 어디서 왔는지, 어떻게 식탁에 오르는지 소개해요.",
};

// 일반적인 재배 환경에 대한 설명이에요. 특정 농가의 사실을 단정하지 않도록 "~수 있어요"로 적었어요.
const REASONS: { reason: UglyReason; description: string }[] = [
  {
    reason: "small",
    description:
      "날씨와 햇빛, 수확 시기에 따라 같은 밭에서 자란 작물도 알 크기가 달라질 수 있어요. 규격보다 작으면 일반 유통에서 빠지기도 해요.",
  },
  {
    reason: "bent",
    description:
      "뿌리채소는 흙 속에서 돌이나 단단한 땅을 만나면 곧게 자라지 못하고 휘거나 갈라질 수 있어요.",
  },
  {
    reason: "scratched",
    description:
      "바람에 가지가 흔들리거나 자라는 동안 작은 상처가 나면 껍질에 흠집이 남을 수 있어요. 겉모양과 실제 품질은 별도로 확인해야 해요.",
  },
  {
    reason: "irregular",
    description:
      "자연에서 자란 작물은 같은 모양으로 자라지 않아요. 크기나 색이 제각각이라 규격 선별에서 빠지는 경우가 많아요.",
  },
];

// 메인에서 옮겨 온 서비스 소개예요. 배송·환불·품질 보증 같은 정책 내용은 담지 않았어요.
const VALUES = [
  {
    title: "농가는 추가 수익",
    body: "판로가 막혔던 규격 외 농산물도 식탁까지 닿을 수 있어요.",
  },
  {
    title: "소비자는 합리적인 가격",
    body: "모양만 다를 뿐, 먹는 데 문제없는 농산물을 부담 없이 만나요.",
  },
  {
    title: "지구는 조금 더 가볍게",
    body: "버려질 뻔한 농산물이 식탁에 오르면 음식물 폐기를 줄일 수 있어요.",
  },
];

const STEPS = [
  {
    title: "농가와 농산물 만나기",
    body: "어떤 농가에서 왜 모양이 달라졌는지 이야기로 확인해요.",
  },
  {
    title: "레시피로 요리 정하기",
    body: "채소별로 간단한 레시피를 찾고, 재료와 순서를 살펴봐요.",
  },
  {
    title: "식탁에 올리기",
    body: "못난이 농산물로 한 끼를 만들어 먹으며 가치소비를 이어가요.",
  },
];

// 상품·농가 정보는 5분마다 새로 확인해요.
export const revalidate = 300;

export default async function StoryPage() {
  const [farms, products] = await Promise.all([
    getFarmStories(),
    getProductList({ sort: "recommended" }),
  ]);

  // 배너: 메인처럼 여러 장이 넘어가요. 가로로 긴 농장 사진만 쓰고, 사진마다 맞는 농가 상세로 이어져요.
  const farmSlide = (
    farmName: string,
    imageUrl: string,
    title: string,
  ): HomeBannerSlide[] => {
    const farm = farms.find((f) => f.farmName === farmName);
    if (!farm) return [];
    return [
      {
        id: farmName,
        href: routes.farm(farmName),
        imageUrl,
        eyebrow: `📍 ${farm.farmRegion ?? "농가 이야기"} · ${farmName}`,
        title,
        sub: farm.story,
        highlight: `농산물 ${farm.products.length}개 보러 가기 ›`,
      },
    ];
  };
  const slides: HomeBannerSlide[] = [
    {
      id: "intro",
      href: "#farms",
      imageUrl: farmPhotos[0].imageUrl,
      eyebrow: "FARM TO TABLE · 농가 이야기",
      title: "한 끼의 시작은, 농가의 하루에서.",
      sub: "밭을 돌보고, 계절을 기다리는 사람들을 만나보세요.",
      highlight: `농가 ${farms.length}곳 만나보기 ›`,
    },
    ...farmSlide(
      "영주 사과마을",
      "/images/farms/youngju-orchard.webp",
      "작아도 아삭하고 달콤한 사과",
    ),
    ...farmSlide(
      "부여 토마토하우스",
      "/images/farms/greenhouse.webp",
      "햇살 가득한 온실에서 익은 토마토",
    ),
    ...farmSlide(
      "청송 사과농원",
      "/images/farms/apple-orchard.webp",
      "산골 과수원의 단단한 사과",
    ),
    ...farmSlide(
      "진주 들판농장",
      "/images/farms/fields.webp",
      "넓은 들판에서 계절을 기다려요",
    ),
    {
      id: "about",
      href: "#about",
      imageUrl: "/images/hero.jpg",
      eyebrow: "못난이마켓 선별 기준",
      title: "모양만 다를 뿐, 맛과 신선도는 그대로",
      sub: "버려질 뻔한 농산물이 식탁에 오르기까지",
      highlight: "우리 이야기 보기 ›",
    },
  ];

  return (
    <>
      <h1 className="sr-only">농가 이야기 · 한 끼의 시작은, 농가의 하루에서</h1>
      {/* 1. 화면 너비 사진 배너: 메인과 같은 넘김 배너 (마켓컬리 기준) */}
      <HomeBanner slides={slides} />

      <div className="container-page pt-6">
        <MockDataNotice subject="농가 이야기와 농산물 정보" />
      </div>

      {/* 2. 농가 목록: 누르면 농가 상세(/story/농가이름)로 가요 */}
      <section
        id="farms"
        aria-labelledby="farms-title"
        className="container-page scroll-mt-24 pt-10 md:pt-14"
      >
        <div className="mb-6 text-center md:mb-8">
          <h2
            id="farms-title"
            className="text-[1.375rem] font-medium md:text-[1.75rem]"
          >
            🌾 이 농산물을 키우는 농가 {farms.length}곳
          </h2>
          <p className="mt-1 text-sm text-ink-muted md:text-base">
            농가를 누르면 판매 상품과 위치, 요리까지 한 번에 볼 수 있어요
          </p>
        </div>
        {farms.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-[18px] lg:grid-cols-4">
            {farms.map((farm) => (
              <li key={farm.farmName}>
                <FarmCard farm={farm} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="bg-sand px-6 py-10 text-center text-ink-muted">
            소개할 농가 정보를 준비하고 있어요.
          </p>
        )}
      </section>

      {/* 3. 우리 이야기 */}
      <section
        id="about"
        aria-labelledby="about-title"
        className="container-page scroll-mt-24 pt-16 md:pt-20"
      >
        <div className="mb-6 text-center md:mb-8">
          <h2
            id="about-title"
            className="text-[1.375rem] font-medium md:text-[1.75rem]"
          >
            못난이마켓은 이런 서비스예요
          </h2>
          <p className="mt-1 text-sm text-ink-muted md:text-base">
            모양이나 크기 때문에 팔기 어려운 농산물을 소개하고, 무엇을 해
            먹을지까지 이어 줘요
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-3 md:gap-[18px]">
          {VALUES.map((value) => (
            <li key={value.title} className="bg-sand p-6">
              <h3 className="text-lg font-bold text-brand-dark">
                {value.title}
              </h3>
              <p className="mt-1 text-ink-muted">{value.body}</p>
            </li>
          ))}
        </ul>
        <ol className="mt-3 grid gap-3 md:mt-[18px] md:grid-cols-3 md:gap-[18px]">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4 border border-line p-6">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white"
              >
                {index + 1}
              </span>
              <div>
                <h3 className="font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 4. 왜 모양이 제각각일까요? */}
      <section
        aria-labelledby="reasons-title"
        className="container-page pt-16 md:pt-20"
      >
        <div className="mb-6 text-center md:mb-8">
          <h2
            id="reasons-title"
            className="text-[1.375rem] font-medium md:text-[1.75rem]"
          >
            왜 모양이 제각각일까요?
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 md:gap-[18px]">
          {REASONS.map(({ reason, description }) => (
            <li
              key={reason}
              className="grid grid-cols-[6rem_1fr] overflow-hidden border border-line sm:grid-cols-[8rem_1fr]"
            >
              <SafeImage
                src={
                  products.find((product) => product.uglyReason === reason)
                    ?.imageUrl
                }
                alt="농산물 참고 이미지"
                className="size-full object-cover"
              />
              <div className="p-4">
                <h3 className="text-lg font-bold">
                  {UGLY_REASON_LABELS[reason]}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. 마무리 띠 */}
      <section className="mt-16 bg-brand-soft md:mt-20">
        <div className="container-page flex flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-[1.375rem] font-bold text-brand-dark md:text-[1.75rem]">
            버려질 뻔한 농산물이 식탁으로
          </h2>
          <p className="max-w-2xl text-ink-muted">
            먹는 데는 문제가 없지만 규격에서 벗어나 판로가 좁아진 농산물에
            새로운 쓰임을 찾아 주는 것, 못난이마켓이 하려는 일이에요.
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Link
              href={routes.recipes}
              className="btn btn-primary rounded-[0.25rem]"
            >
              레시피 보러 가기
              <ArrowRightIcon width={18} height={18} />
            </Link>
            {routes.productList && (
              <Link
                href={routes.productList}
                className="btn btn-secondary rounded-[0.25rem]"
              >
                못난이 농산물 보기
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

// 농가 카드 (마켓컬리 상품 카드 비율): 사진 → 농가 이름 → 지역 → 주요 농산물 → 소개 두 줄
function FarmCard({ farm }: { farm: FarmStory }) {
  const photo = getFarmPhoto(farm);
  const crops = [...new Set(farm.products.map((p) => p.vegetableName))];
  return (
    <Link href={routes.farm(farm.farmName)} className="group block">
      <span className="relative block overflow-hidden rounded-[0.25rem] bg-sand">
        <SafeImage
          src={photo.imageUrl}
          alt={photo.alt}
          className="aspect-[249/320] w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute left-2.5 top-2.5 rounded-[0.25rem] bg-brand px-2 py-0.5 text-sm font-medium text-white">
          상품 {farm.products.length}개
        </span>
      </span>
      <span className="mt-3 block text-base font-bold group-hover:text-brand">
        {farm.farmName}
      </span>
      {farm.farmRegion && (
        <span className="block text-sm text-ink-muted">
          📍 {farm.farmRegion}
        </span>
      )}
      <span className="mt-1 block text-sm text-brand-dark">
        {crops.join(" · ")}
      </span>
      {farm.story && (
        <span className="mt-1 line-clamp-2 block text-sm leading-normal text-ink-muted">
          {farm.story}
        </span>
      )}
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-brand">
        농가 자세히 보기 <ArrowRightIcon width={14} height={14} />
      </span>
    </Link>
  );
}
