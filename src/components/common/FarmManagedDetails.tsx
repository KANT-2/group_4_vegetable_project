"use client";

import { useAdminStore } from "@/components/admin/AdminStore";
import { FarmLocationMap } from "./FarmLocationMap";
import type { AdminFarm } from "@/lib/admin-store";
import type { FarmStoryDetail } from "@/data/farm-stories";

export function useManagedFarm(id: string) {
  const { otherChanges, trash, deletedKeys } = useAdminStore();
  const deleted =
    trash.some((entry) => entry.kind === "farm" && entry.item.id === id) ||
    deletedKeys?.includes(`farm:${id}`);
  return deleted
    ? undefined
    : ((otherChanges?.[`farm:${id}`] ?? Object.values(otherChanges ?? {}).find((item) => "farmName" in item && item.farmName === id)) as AdminFarm | undefined);
}

export function FarmManagedDetails({
  farmId,
  name,
  region,
  detail,
}: {
  farmId: string;
  name: string;
  region?: string;
  detail?: FarmStoryDetail;
}) {
  const managed = useManagedFarm(farmId);
  const current = managed?.detail ?? detail;
  const farmName = managed?.farmName ?? name;
  return (
    <>
      {current && (
        <section
          id="story"
          aria-labelledby="story-title"
          className="container-page scroll-mt-16 pt-14"
        >
          <h2 id="story-title" className="text-xl font-bold md:text-2xl">
            {farmName} 이야기
          </h2>
          <dl className="mt-5 divide-y divide-line border-y border-line">
            {[
              ["땅과 날씨", current.land],
              ["이렇게 키워요", current.growing],
              ["모양이 제각각인 이유", current.ugly],
              ["맛있게 먹는 법", current.eat],
            ].map(([term, body]) => (
              <div
                key={term}
                className="grid gap-1 py-4 md:grid-cols-[12rem_1fr] md:gap-6"
              >
                <dt className="font-bold text-brand-dark">{term}</dt>
                <dd className="leading-relaxed text-ink-muted">{body}</dd>
              </div>
            ))}
          </dl>
          <blockquote className="mt-5 bg-sand px-5 py-4 text-lg font-bold text-brand-dark">
            “{current.quote}”
            <span className="mt-1 block text-sm font-normal text-ink-muted">
              — {farmName} 농장지기
            </span>
          </blockquote>
        </section>
      )}
      <section
        id="location"
        aria-labelledby="location-title"
        className="container-page scroll-mt-16 pt-14"
      >
        <h2 id="location-title" className="mb-3 text-xl font-bold md:text-2xl">
          농가 위치
        </h2>
        {!managed?.address && (
          <p className="mb-3 text-sm text-ink-muted">
            정확한 농장 주소가 아직 등록되지 않아 지역 위치를 표시합니다.
          </p>
        )}
        <FarmLocationMap
          name={farmName}
          address={managed?.address}
          latitude={managed?.latitude}
          longitude={managed?.longitude}
          mapEmbedUrl={managed?.mapEmbedUrl}
          fallback={managed?.farmRegion ?? region ?? name}
        />
      </section>
    </>
  );
}
