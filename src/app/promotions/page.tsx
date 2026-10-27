import Link from "next/link";
import Image from "next/image";
import { publicPromotions } from "@/services/managed-content";
export const metadata = { title: "혜택과 이야기" };
export default function PromotionsPage() {
  const promotions = publicPromotions();
  return (
    <div className="container-page py-10 md:py-16">
      <p className="text-xs font-bold tracking-widest text-brand">
        MOTNANI BENEFITS
      </p>
      <h1 className="mt-3 text-3xl font-bold">혜택과 이야기</h1>
      <p className="mt-3 text-sm text-ink-muted">
        오늘의 장보기부터 가족과 함께하는 하루까지.
      </p>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {promotions.map((promo) => (
          <li key={promo.slug}>
            <Link
              href={`/promotions/${promo.slug}`}
              className="group block overflow-hidden rounded-2xl border border-line"
            >
              <div className="relative aspect-[3/1]">
                <Image
                  src={promo.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 525px"
                  className="object-cover"
                  unoptimized={promo.image.startsWith("data:")}
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold text-brand">
                  {promo.label}
                </p>
                <h2 className="mt-2 text-lg font-bold group-hover:text-brand">
                  {promo.title} →
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                  {promo.benefitLabel}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
