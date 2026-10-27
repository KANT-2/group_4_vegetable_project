"use client";

import Link from "next/link";
import { SafeImage } from "@/components/common/SafeImage";
import { useAdminStore } from "@/components/admin/AdminStore";
import { managedPromotions, safePromotionHref } from "@/lib/admin-promotions";
import type { AdminPromotion } from "@/lib/admin-store";

export function PromotionPreview({ id, promotion }: { id: string; promotion?: AdminPromotion }) {
  const store = useAdminStore();
  const item = promotion ?? managedPromotions(store).find((promo) => promo.id === id);
  return (
    <div className="container-page py-10 md:py-16">
      {!promotion && <Link
        href="/admin/promotions"
        className="text-sm font-semibold text-brand"
      >
        ← 관리 목록으로 돌아가기
      </Link>}
      {!item ? (
        <p className="mt-8 text-ink-muted">
          미리볼 공지가 없습니다. 관리 목록에서 다시 선택해 주세요.
        </p>
      ) : (
        <>
          {!promotion && <p className="mt-6 text-sm text-ink-muted">
            고객 화면 미리보기{!item.published && " · 비공개"}
          </p>}
          <SafeImage
            src={item.image}
            alt={item.title}
            className="mt-5 aspect-[3/1] w-full rounded-2xl object-cover"
          />
          <p className="mt-8 font-semibold text-brand">{item.label}</p>
          <h1 className="mt-3 text-3xl font-bold">{item.title}</h1>
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-ink-muted">
            {item.description}
          </p>
          {(item.benefit || item.benefitLabel) && (
            <div className="mt-8 rounded-2xl bg-brand-soft p-8 text-center">
              <strong className="text-4xl text-brand">{item.benefit}</strong>
              <p className="mt-3">{item.benefitLabel}</p>
            </div>
          )}
          {item.facts.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">상세 안내</h2>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {item.facts.map(([label, text], i) => (
                  <div
                    key={i}
                    className="grid gap-2 py-4 sm:grid-cols-[1fr_3fr]"
                  >
                    <dt className="font-semibold text-brand">{label}</dt>
                    <dd className="whitespace-pre-wrap text-ink-muted">
                      {text}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {item.steps.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-bold">이용 방법 · 진행 순서</h2>
              <ol className="mt-4 space-y-5">
                {item.steps.map(([title, text], i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-bold">{title}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-ink-muted">
                        {text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {item.notes.length > 0 && (
            <section className="mt-10 rounded-card bg-sand p-6">
              <h2 className="font-bold">꼭 확인해요</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-ink-muted">
                {item.notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </section>
          )}
          {safePromotionHref(item.productHref) && (
            <Link href={item.productHref} className="btn btn-primary mt-8">
              {item.productLabel}
            </Link>
          )}
        </>
      )}
    </div>
  );
}
