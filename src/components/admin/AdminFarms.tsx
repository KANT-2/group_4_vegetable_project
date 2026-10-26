"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AdminProducts } from "./AdminProducts";
import { SafeImage } from "@/components/common/SafeImage";
import { SearchIcon } from "@/components/common/Icons";
import { getFarmPhotos } from "@/lib/farm-photo";
import { groupFarmsByProvince, provinceOf } from "@/lib/farm-story";
import { getFarmStoryDetail } from "@/data/farm-stories";
import type { FarmStory } from "@/types/showcase";
import type { AdminFarm } from "@/lib/admin-store";
import { useAdminStore } from "./AdminStore";
import { FarmEditDialog } from "./FarmEditDialog";
import { CheckboxDropdown } from "./CheckboxDropdown";

export function AdminFarms({ farms }: { farms: FarmStory[] }) {
  const { otherChanges, trash, deletedKeys, saveFarm, moveToTrash } =
    useAdminStore();
  const basePhotos = getFarmPhotos(farms);
  const source = farms.map((farm): AdminFarm => ({
    ...farm,
    id: farm.farmName,
    name: farm.farmName,
    imageUrl: basePhotos.get(farm.farmName)?.imageUrl ?? "",
    story: getFarmStoryDetail(farm.farmName)?.headline ?? farm.story,
    crops: [...new Set(farm.products.map((product) => product.vegetableName))],
  }));
  const overrides = Object.fromEntries(
    Object.entries(otherChanges ?? {})
      .filter(([key]) => key.startsWith("farm:"))
      .map(([, value]) => [value.id, value as AdminFarm]),
  );
  const sourceIds = new Set(source.map((farm) => farm.id));
  const removed = new Set([
    ...trash
      .filter((entry) => entry.kind === "farm")
      .map((entry) => entry.item.id),
    ...(deletedKeys ?? [])
      .filter((key) => key.startsWith("farm:"))
      .map((key) => key.slice(5)),
  ]);
  const items = [
    ...Object.values(overrides).filter((farm) => !sourceIds.has(farm.id)),
    ...source.map((farm) => overrides[farm.id] ?? farm),
  ].filter((farm) => !removed.has(farm.id));
  const [editing, setEditing] = useState<AdminFarm | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const [query, setQuery] = useState("");
  const [keyword, setKeyword] = useState("");
  const [province, setProvince] = useState("");
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const cropOptions = [...new Set(items.flatMap((farm) => farm.crops))].sort(
    (a, b) => a.localeCompare(b, "ko"),
  );
  const [page, setPage] = useState(1);
  const menu = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const groups = groupFarmsByProvince(items);
  const photos = getFarmPhotos(farms);
  const normalize = (text: string) =>
    text.toLocaleLowerCase().replace(/\s/g, "");
  const filtered = items.filter(
    (farm) =>
      (!province || provinceOf(farm.farmRegion) === province) &&
      (selectedCrops.length === 0 ||
        farm.crops.some((crop) => selectedCrops.includes(crop))) &&
      normalize(
        [
          farm.farmName,
          farm.farmRegion,
          provinceOf(farm.farmRegion),
          farm.story,
          ...farm.crops,
        ].join(" "),
      ).includes(normalize(keyword)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  function goToPage(value: number) {
    setPage(value);
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <AdminProducts
      view="farms"
      description="농가 등록과 농가 정보를 관리해요."
      topNotice={
        notice && (
          <div
            role="status"
            className="mb-5 flex items-center justify-between rounded-card border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
          >
            <span>{notice}</span>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => setNotice("")}
              className="min-h-11 min-w-11"
            >
              ×
            </button>
          </div>
        )
      }
      headerAction={
        <button
          type="button"
          className="btn btn-primary shrink-0"
          onClick={(event) => {
            trigger.current = event.currentTarget;
            setCreating(true);
            setEditing({
              id: `farm-${crypto.randomUUID()}`,
              name: "",
              farmName: "",
              products: [],
              imageUrl: "",
              crops: [],
            });
            setNotice("");
          }}
        >
          + 농가 등록하기
        </button>
      }
    >
      <div ref={top} className="mt-7 scroll-mt-5">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setKeyword(query.trim());
            setProvince("");
            setPage(1);
          }}
          className="flex flex-wrap gap-3"
        >
          <label htmlFor="admin-farm-search" className="sr-only">
            농가 이름·지역·재배 품목으로 검색
          </label>
          <input
            id="admin-farm-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="농가 이름·지역·재배 품목으로 검색"
            className="h-12 min-w-0 flex-1 basis-64 rounded-control border border-field-border bg-white px-4"
          />
          <CheckboxDropdown
            label="재배 품목"
            options={cropOptions.map((crop) => ({ value: crop, label: crop }))}
            selected={selectedCrops}
            onChange={(values) => {
              setSelectedCrops(values);
              setPage(1);
            }}
          />
          <button className="btn btn-primary">
            <SearchIcon width={20} height={20} />
            검색
          </button>
        </form>
        <div className="relative mt-6 border-b border-line pr-10">
          <div
            ref={menu}
            role="group"
            aria-label="농가 지역별 필터"
            className="flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {[
              { province: "", name: "전체", count: farms.length },
              ...groups.map((group) => ({
                province: group.province,
                name: group.province,
                count: group.farms.length,
              })),
            ].map((option) => (
              <button
                key={option.province}
                type="button"
                aria-pressed={province === option.province}
                onClick={() => {
                  setProvince(option.province);
                  setQuery("");
                  setKeyword("");
                  setPage(1);
                }}
                className={`min-h-14 shrink-0 border-b-2 px-4 text-base font-bold ${province === option.province ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-brand"}`}
              >
                {option.name}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="다음 지역 보기"
            onClick={() =>
              menu.current?.scrollBy({ left: 300, behavior: "smooth" })
            }
            className="absolute top-0 right-0 flex h-14 w-10 items-center justify-center bg-sand text-2xl"
          >
            ›
          </button>
        </div>
        <p aria-live="polite" className="mt-8 mb-6 font-bold">
          농가 {filtered.length}개
        </p>
        {visible.length ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((farm) => {
              const photo = photos.get(farm.farmName);
              const crops = farm.crops;
              return (
                <article key={farm.id} className="card h-full overflow-hidden">
                  <div className="relative">
                    <SafeImage
                      src={farm.imageUrl || photo?.imageUrl}
                      alt={photo?.alt ?? `${farm.farmName} 농가 풍경`}
                      className={`aspect-[4/3] w-full object-cover ${photo?.position ?? ""}`}
                    />
                    <span className="absolute top-3 left-3 rounded-control bg-brand px-3 py-1 text-sm font-bold text-white">
                      상품 {farm.products.length}개
                    </span>
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        type="button"
                        aria-label={`${farm.farmName} 수정`}
                        onClick={(event) => {
                          trigger.current = event.currentTarget;
                          setCreating(false);
                          setEditing(farm);
                          setNotice("");
                        }}
                        className="min-h-11 rounded-control border border-brand bg-white px-4 text-sm font-bold text-brand shadow-sm hover:bg-brand-soft"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        aria-label={`${farm.farmName} 삭제`}
                        onClick={async () => {
                          if (await moveToTrash({ kind: "farm", item: farm }))
                            setNotice("농가가 휴지통으로 이동되었습니다.");
                        }}
                        className="min-h-11 rounded-control border border-line bg-white px-4 text-sm font-bold text-danger shadow-sm hover:bg-danger-soft"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 p-4 sm:p-5">
                    <h2 className="text-lg font-extrabold">{farm.farmName}</h2>
                    <p className="flex items-center gap-2 text-sm text-ink-muted">
                      <svg
                        aria-hidden="true"
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {farm.farmRegion ?? "지역 미등록"}
                    </p>
                    <p className="border-t border-line pt-3 text-sm font-semibold text-brand">
                      {crops.join(" · ") || "재배 품목 미등록"}
                    </p>
                    <p className="text-sm leading-relaxed text-ink-muted">
                      {farm.story ?? "농가 소개를 준비하고 있습니다."}
                    </p>
                    {overrides[farm.id] && (
                      <Link
                        href={`/story/preview/${encodeURIComponent(farm.id)}`}
                        className="inline-flex min-h-11 items-center text-sm font-bold text-brand"
                      >
                        고객 화면 미리보기 ↗
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-card border border-line bg-white px-5 py-16 text-center text-ink-muted">
            검색 조건에 맞는 농가가 없습니다.
          </div>
        )}
        {filtered.length > 0 && (
          <nav
            aria-label="농가 페이지"
            className="mt-8 flex flex-wrap justify-center gap-1"
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="이전 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ‹
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  aria-label={`${number}페이지`}
                  aria-current={currentPage === number ? "page" : undefined}
                  onClick={() => goToPage(number)}
                  className={`min-h-11 min-w-11 rounded-control ${currentPage === number ? "bg-brand-soft font-bold text-brand" : "hover:bg-white"}`}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage === pages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="다음 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ›
            </button>
          </nav>
        )}
        {editing && (
          <FarmEditDialog
            key={editing.id}
            farm={editing}
            creating={creating}
            existingNames={[
              ...items
                .filter((farm) => farm.id !== editing.id)
                .map((farm) => farm.farmName),
              ...trash
                .filter((entry) => entry.kind === "farm")
                .map((entry) => entry.item.name),
            ]}
            onClose={() => {
              setEditing(null);
              if (trigger.current?.isConnected) trigger.current.focus();
            }}
            onSave={(farm) => {
              saveFarm(farm);
              if (creating) {
                setQuery("");
                setKeyword("");
                setProvince("");
                setSelectedCrops([]);
                setPage(1);
              }
              setNotice(
                creating
                  ? "농가가 등록되었습니다."
                  : "농가 정보가 수정되었습니다.",
              );
            }}
          />
        )}
      </div>
    </AdminProducts>
  );
}
