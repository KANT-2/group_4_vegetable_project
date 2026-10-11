// 농가 이야기 /story (A 담당)
// 농가·농산물 정보는 상품 데이터(B)에서 가져와 농가별로 묶어 보여줘요. (services/showcase.ts)
// 실제 농가 자료가 아닌 개발용 예시일 때는 화면에 그렇게 표시돼요.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/common/Icons";
import { MockDataNotice } from "@/components/common/MockDataNotice";
import { SafeImage } from "@/components/common/SafeImage";
import { routes } from "@/lib/routes";
import { getRecipesByVegetable } from "@/services/recipes";
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
      "바람에 가지가 흔들리거나 자라는 동안 작은 상처가 나면 껍질에 흠집이 남을 수 있어요. 흠집 난 부분만 도려내면 먹는 데는 문제가 없어요.",
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

// 처음에 보여줄 농가 수. 나머지는 "더 보기"로 펼쳐요.
const VISIBLE_FARMS = 6;

// 상품·농가 정보는 5분마다 새로 확인해요.
export const revalidate = 300;

export default async function StoryPage() {
  const farms = await getFarmStories();

  return (
    <>
      <section className="bg-sand/60">
        <div className="container-page section">
          <h1 className="page-title max-w-2xl">
            모양은 달라도, 정성은 똑같아요
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-muted">
            못난이 농산물은 맛과 영양에 문제가 있는 것이 아니라, 정해진 규격과
            조금 다르게 자란 농산물이에요. 어떤 이유로 모양이 달라지는지, 어떤
            농가에서 자란 채소인지 만나보세요.
          </p>
        </div>
      </section>

      <div className="container-page pt-6">
        <MockDataNotice subject="농가 이야기와 농산물 정보" />
      </div>

      <section
        id="about"
        aria-labelledby="about-title"
        className="container-page section pb-0 md:pb-0"
      >
        <h2 id="about-title" className="section-title">
          우리 이야기 — 못난이마켓은 이런 서비스예요
        </h2>
        <p className="mt-3 max-w-2xl text-ink-muted">
          모양이나 크기 때문에 일반 유통에서 팔기 어려운 농산물을 소개하고, 그
          채소로 무엇을 해 먹을지까지 이어 주는 서비스예요.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {VALUES.map((value) => (
            <li key={value.title} className="card p-5">
              <h3 className="font-extrabold">{value.title}</h3>
              <p className="mt-1 text-ink-muted">{value.body}</p>
            </li>
          ))}
        </ul>
        <h3 className="mt-10 text-lg font-extrabold">이렇게 만나요</h3>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card flex gap-4 p-5">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-extrabold text-white"
              >
                {index + 1}
              </span>
              <div>
                <h4 className="font-extrabold">{step.title}</h4>
                <p className="mt-1 text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="reasons-title"
        className="container-page section"
      >
        <h2 id="reasons-title" className="section-title">
          왜 모양이 제각각일까요?
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {REASONS.map(({ reason, description }) => (
            <li key={reason} className="card p-5">
              <h3 className="text-lg font-extrabold">
                {UGLY_REASON_LABELS[reason]}
              </h3>
              <p className="mt-2 text-ink-muted">{description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="farms-title"
        className="container-page pb-10 md:pb-16"
      >
        <h2 id="farms-title" className="section-title">
          농가를 만나보세요
        </h2>
        {farms.length > 0 ? (
          <>
            <ul className="mt-6 space-y-6">
              {farms.slice(0, VISIBLE_FARMS).map((farm) => (
                <li key={farm.farmName}>
                  <FarmCard farm={farm} />
                </li>
              ))}
            </ul>
            {farms.length > VISIBLE_FARMS && (
              // 농가가 많아져도 페이지가 끝없이 길어지지 않도록 나머지는 접어 둬요. (자바스크립트 없이 동작)
              <details className="group mt-6">
                <summary className="btn btn-secondary mx-auto cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">
                    농가 {farms.length - VISIBLE_FARMS}곳 더 보기
                  </span>
                  <span className="hidden group-open:inline">접기</span>
                </summary>
                <ul className="mt-6 space-y-6">
                  {farms.slice(VISIBLE_FARMS).map((farm) => (
                    <li key={farm.farmName}>
                      <FarmCard farm={farm} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : (
          <p className="card mt-6 px-6 py-10 text-center text-ink-muted">
            소개할 농가 정보를 준비하고 있어요.
          </p>
        )}
      </section>

      <section className="bg-brand-dark text-white">
        <div className="container-page section text-center">
          <h2 className="section-title">버려질 뻔한 농산물이 식탁으로</h2>
          <p className="mx-auto mt-4 max-w-2xl text-white/90">
            먹는 데는 문제가 없지만 규격에서 벗어나 판로가 좁아진 농산물에
            새로운 쓰임을 찾아 주는 것, 못난이마켓이 하려는 일이에요. 어떻게
            요리해 먹을 수 있는지 레시피에서 확인해 보세요.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={routes.recipes}
              className="btn bg-white text-brand-dark hover:bg-brand-soft"
            >
              레시피 보러 가기
              <ArrowRightIcon width={18} height={18} />
            </Link>
            {routes.productList && (
              <Link
                href={routes.productList}
                className="btn border-white/60 text-white hover:bg-white/10"
              >
                채소 만나보기
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

async function FarmCard({ farm }: { farm: FarmStory }) {
  const lead = farm.products[0];
  // 이 농가의 채소로 만들 수 있는 레시피 (같은 레시피는 한 번만)
  const recipeLists = await Promise.all(
    [...new Set(farm.products.map((product) => product.vegetableId))].map(
      (id) => getRecipesByVegetable(id),
    ),
  );
  const recipes = [
    ...new Map(
      recipeLists.flat().map((recipe) => [recipe.id, recipe]),
    ).values(),
  ];

  return (
    <article className="card grid overflow-hidden md:grid-cols-[2fr_3fr]">
      <SafeImage
        src={lead.imageUrl}
        alt={`${farm.farmName}에서 기른 ${lead.name} 사진`}
        className="aspect-[4/3] size-full object-cover md:aspect-auto"
      />
      <div className="space-y-4 p-5 sm:p-7">
        <header>
          <h3 className="text-xl font-extrabold">{farm.farmName}</h3>
          {farm.farmRegion && (
            <p className="text-ink-muted">{farm.farmRegion}</p>
          )}
        </header>
        {farm.story && <p>{farm.story}</p>}

        <div>
          <h4 className="text-sm font-bold text-ink-muted">
            이 농가의 못난이 농산물
          </h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {farm.products.map((product) => {
              const href = routes.product(product.id);
              return (
                <li key={product.id}>
                  {href ? (
                    <Link
                      href={href}
                      className="chip min-h-12 bg-brand-soft px-4 text-brand-dark"
                    >
                      {product.name}
                    </Link>
                  ) : (
                    <span className="chip bg-brand-soft text-brand-dark">
                      {product.name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {recipes.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-ink-muted">
              이 채소로 만드는 요리
            </h4>
            <ul className="mt-2 flex flex-wrap gap-2">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <Link
                    href={routes.recipe(recipe.id)}
                    className="inline-flex min-h-12 items-center rounded-full border border-line bg-surface px-4 font-bold hover:bg-brand-soft"
                  >
                    {recipe.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
