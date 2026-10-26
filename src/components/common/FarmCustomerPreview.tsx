"use client";

import Link from "next/link";
import { useManagedFarm, FarmManagedDetails } from "./FarmManagedDetails";
import { FarmManagedGallery } from "./FarmManagedGallery";

export function FarmCustomerPreview({ id }: { id: string }) {
  const farm = useManagedFarm(id);
  if (!farm)
    return (
      <section className="container-page section">
        <h1 className="page-title">농가 정보를 찾을 수 없습니다.</h1>
        <p className="mt-3 text-ink-muted">
          저장된 농가 정보를 불러오는 중이거나 삭제된 농가입니다.
        </p>
        <Link href="/admin/farms" className="btn btn-secondary mt-6">
          농가 관리로 돌아가기
        </Link>
      </section>
    );
  return (
    <>
      <section className="container-page grid gap-8 pt-8 md:grid-cols-2">
        <FarmManagedGallery
          farmId={farm.id}
          name={farm.farmName}
          fallback={farm.imageUrl}
        />
        <div>
          <p className="font-bold text-brand">{farm.farmRegion}</p>
          <h1 className="page-title mt-2">{farm.farmName}</h1>
          <p className="mt-4 text-ink-muted">
            {farm.detail?.headline ?? farm.story}
          </p>
          <p className="mt-6 border-y border-line py-4">
            주요 농산물　{farm.crops.join(" · ")}
          </p>
          <a href="#location" className="btn btn-primary mt-6">
            지도에서 위치 보기
          </a>
        </div>
      </section>
      <FarmManagedDetails
        farmId={farm.id}
        name={farm.farmName}
        region={farm.farmRegion}
        detail={farm.detail}
      />
      <div className="pb-16" />
    </>
  );
}
