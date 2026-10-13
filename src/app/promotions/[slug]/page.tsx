import type { Metadata } from "next";
import Link from "next/link";
import { CampaignHero } from "@/components/promotions/CampaignHero";
import { homeCampaigns } from "@/data/home-campaigns";
import { notFound } from "next/navigation";
import { CouponClaimButton } from "@/components/promotions/CouponClaimButton";
import ProductCard from "@/components/products/ProductCard";
import { promotions } from "@/data/promotions";
import { COLLECTIONS } from "@/lib/catalog";
import { getProductList } from "@/services/products";

export const revalidate = 300;
export function generateStaticParams() {
  return promotions.map(({ slug }) => ({ slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const promo = promotions.find((item) => item.slug === slug);
  return {
    title: promo ? promo.label : "행사를 찾을 수 없어요",
  };
}
export default async function PromotionPage({ params }: Props) {
  const { slug } = await params;
  const promo = promotions.find((item) => item.slug === slug);
  const campaign = homeCampaigns.find((item) => item.id === slug);
  if (!promo || !campaign) notFound();
  const products = await getProductList({ sort: "recommended" });
  const selected = products
    .filter((product) => {
      if (promo.vegetables)
        return promo.vegetables.includes(product.vegetableId);
      if (slug === "first-box") return COLLECTIONS.single.match(product);
      if (slug === "openrun-coupon") return COLLECTIONS.bigsale.match(product);
      return product.isSeasonal;
    })
    .slice(0, 4);
  return (
    <div className="pb-16 md:pb-24">
      <nav
        aria-label="현재 위치"
        className="container-page flex gap-2 py-5 text-xs text-ink-muted"
      >
        <Link href="/">홈</Link>
        <span aria-hidden="true">/</span>
        <Link href="/promotions">혜택과 이야기</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{promo.label}</span>
      </nav>
      <h1 className="sr-only">
        {promo.label} · {campaign.title}
      </h1>
      <CampaignHero campaign={campaign} />
      <nav
        aria-label="행사 페이지 메뉴"
        className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur"
      >
        <div className="container-page grid grid-cols-3 text-center text-sm font-semibold">
          {[
            ["#benefit", "혜택·안내"],
            ["#products", "추천 상품"],
            ["#notice", "꼭 확인해요"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="py-4 hover:text-brand">
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="container-page max-w-5xl">
        <section id="benefit" className="scroll-mt-20 py-12 md:py-16">
          <p className="text-center text-xs font-semibold tracking-widest text-brand">
            {promo.kind === "coupon"
              ? "A LITTLE GIFT"
              : promo.kind === "delivery"
                ? "FRESH TO YOUR TABLE"
                : "FAMILY MOMENTS"}
          </p>
          <h2 className="mt-3 text-center text-2xl font-bold md:text-3xl">
            {promo.kind === "coupon"
              ? "장보기가 더 즐거워지는 혜택"
              : promo.kind === "delivery"
                ? "배송비, 미리 확인하세요"
                : "우리 가족의 특별한 토요일"}
          </h2>
          <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface md:grid md:grid-cols-[.8fr_1.2fr]">
            <div className="flex flex-col justify-center border-b border-dashed border-brand/30 bg-brand-soft px-6 py-8 text-center md:border-b-0 md:border-r">
              <span className="text-sm font-semibold text-brand">
                {promo.label}
              </span>
              <strong className="mt-3 text-5xl font-bold tracking-tight text-brand">
                {promo.benefit}
              </strong>
              <span className="mt-3 text-sm">{promo.benefitLabel}</span>
              {promo.kind === "coupon" && (
                <CouponClaimButton campaignId={promo.slug} />
              )}
              {promo.kind !== "delivery" && (
                <span className="mt-5 text-xs text-ink-muted">
                  {promo.kind === "coupon"
                    ? "쿠폰을 받아 내 쿠폰함에 보관하세요"
                    : "예약 접수 준비 중"}
                </span>
              )}
            </div>
            <dl className="divide-y divide-line px-6 py-3">
              {promo.facts.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[6.5rem_1fr] gap-3 py-4 text-sm"
                >
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-medium leading-6">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {promo.steps.map(([title, text], index) => (
              <article key={title} className="rounded-xl bg-sand p-6">
                <span className="text-xs font-bold text-brand">
                  STEP 0{index + 1}
                </span>
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p>
              </article>
            ))}
          </div>
          {promo.kind === "delivery" && (
            <Link
              className="mt-5 inline-block text-sm font-semibold text-brand underline underline-offset-4"
              href="/mypage"
            >
              내 배송지 관리하기 →
            </Link>
          )}
        </section>
        <section
          id="products"
          className="scroll-mt-20 border-t border-line py-12"
        >
          <h2 className="text-center text-2xl font-bold">
            {promo.kind === "delivery"
              ? "신선한 제철 장보기"
              : promo.kind === "experience"
                ? "집에서도 함께 준비해요"
                : "이 혜택과 잘 어울려요"}
          </h2>
          <p className="mt-3 text-center text-sm text-ink-muted">
            모양은 달라도, 맛과 신선도는 그대로
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {selected.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          <div className="mt-8 text-center">
            <Link href={promo.productHref} className="btn btn-secondary">
              {promo.productLabel} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
        <section
          id="notice"
          className="scroll-mt-20 rounded-xl bg-sand p-6 md:p-8"
        >
          <h2 className="text-lg font-bold">꼭 확인해 주세요</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-6 text-ink-muted">
            {promo.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {promo.kind === "coupon" && (
            <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-ink-muted">
              받은 쿠폰은 장바구니의 내 쿠폰 탭에서 확인할 수 있어요. 결제
              화면에서 쿠폰을 선택해 할인받는 기능은 준비 중이에요.
            </p>
          )}
        </section>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/promotions" className="btn btn-secondary">
            다른 혜택 보기
          </Link>
          {slug === "kimjang-coupon" && (
            <Link href="/promotions/family-kimjang" className="btn btn-primary">
              가족 김장체험 알아보기
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
