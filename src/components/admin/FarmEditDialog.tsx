"use client";

import { useEffect, useRef, useState } from "react";
import { vegetables } from "@/data/mock/vegetables";
import { products } from "@/data/mock/products";
import { getFarmStoryDetail } from "@/data/farm-stories";
import { parseFarmLocation } from "@/lib/farm-location";
import { FarmLocationMap } from "@/components/common/FarmLocationMap";
import { CheckboxDropdown } from "./CheckboxDropdown";
import { RecipeImagePicker } from "./RecipeImagePicker";
import { useUnsavedDialog } from "./useUnsavedDialog";
import type { AdminFarm } from "@/lib/admin-store";

const field =
  "mt-2 min-h-12 w-full rounded-control border border-line bg-white px-3 py-2 text-base font-normal";
const storyFields = [
  { key: "land", label: "땅과 날씨" },
  { key: "growing", label: "이렇게 키워요" },
  { key: "ugly", label: "모양이 제각각인 이유" },
  { key: "eat", label: "맛있게 먹는 법" },
  { key: "quote", label: "농장지기 한마디" },
] as const;

export function FarmEditDialog({
  farm,
  creating,
  existingNames,
  onSave,
  onClose,
}: {
  farm: AdminFarm;
  creating: boolean;
  existingNames: string[];
  onSave: (farm: AdminFarm) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const discard = useUnsavedDialog(dialog);
  const [images, setImages] = useState(
    [farm.imageUrl, ...(farm.additionalImageUrls ?? [])]
      .filter(Boolean)
      .slice(0, 3),
  );
  const [crops, setCrops] = useState(farm.crops);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [address, setAddress] = useState(farm.address ?? "");
  const [latitude, setLatitude] = useState(farm.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(farm.longitude?.toString() ?? "");
  const [embedUrl, setEmbedUrl] = useState(farm.mapEmbedUrl ?? "");
  const [preview, setPreview] = useState<{
    address?: string;
    latitude?: number;
    longitude?: number;
    mapEmbedUrl?: string;
  }>({
    address: farm.address,
    latitude: farm.latitude,
    longitude: farm.longitude,
    mapEmbedUrl: farm.mapEmbedUrl,
  });
  const detail =
    farm.detail ??
    getFarmStoryDetail(farm.id) ??
    getFarmStoryDetail(farm.farmName);
  const options = [
    ...new Set(
      products
        .map((product) => product.farmRegion)
        .filter((region): region is string => Boolean(region))
        .concat(farm.farmRegion ? [farm.farmRegion] : []),
    ),
  ].sort((a, b) => a.localeCompare(b, "ko"));
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={discard.onCancel}
      aria-labelledby="farm-form-title"
      onClose={onClose}
      className={
        creating
          ? "fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-card border border-line bg-white p-6 shadow-xl backdrop:bg-black/25 sm:p-8"
          : "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-xl overflow-y-auto border-l border-line bg-white p-6 shadow-xl backdrop:bg-black/25 sm:p-8"
      }
    >
      <div className="mb-6 flex items-center justify-between">
        <h2 id="farm-form-title" className="text-2xl font-bold">
          {creating ? "농가 등록하기" : "농가 정보 수정"}
        </h2>
        <button
          type="button"
          aria-label="농가 입력창 닫기"
          onClick={discard.requestClose}
          className="min-h-11 min-w-11 text-3xl text-ink-muted"
        >
          ×
        </button>
      </div>
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name") ?? "").trim();
          const region = String(data.get("region") ?? "").trim();
          const headline = String(data.get("headline") ?? "").trim();
          const storyDetail = {
            headline,
            land: String(data.get("land") ?? "").trim(),
            growing: String(data.get("growing") ?? "").trim(),
            ugly: String(data.get("ugly") ?? "").trim(),
            eat: String(data.get("eat") ?? "").trim(),
            quote: String(data.get("quote") ?? "").trim(),
          };
          if (reading) return;
          if (
            !name ||
            !region ||
            !images.length ||
            images.length > 3 ||
            !crops.length ||
            Object.values(storyDetail).some((value) => !value)
          ) {
            setError(
              "농가명·지역·이미지 1~3장·재배 품목·농가 이야기를 모두 입력해 주세요.",
            );
            return;
          }
          const location = parseFarmLocation(
            address,
            latitude,
            longitude,
            embedUrl,
          );
          if (!location.ok) {
            setError(location.error);
            return;
          }
          if (
            existingNames.some(
              (value) => value.replace(/\s/g, "") === name.replace(/\s/g, ""),
            )
          ) {
            setError("이미 등록된 농가명입니다.");
            return;
          }
          onSave({
            ...farm,
            name,
            farmName: name,
            farmRegion: region,
            story: headline,
            detail: storyDetail,
            imageUrl: images[0],
            additionalImageUrls: images.slice(1),
            crops,
            ...location.value,
          });
          dialog.current?.close();
        }}
      >
        <label className="block text-sm font-bold">
          농가명
          <input
            name="name"
            defaultValue={farm.farmName}
            required
            maxLength={100}
            placeholder="농가 이름을 입력해 주세요"
            className={field}
          />
        </label>
        <label className="block text-sm font-bold">
          지역
          <select
            name="region"
            defaultValue={farm.farmRegion ?? ""}
            required
            className={field}
          >
            <option value="" disabled>
              지역 선택
            </option>
            {options.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <RecipeImagePicker
          label="농가 이미지"
          images={images}
          onChange={setImages}
          onReading={setReading}
        />
        <div>
          <p className="mb-2 text-sm font-bold">재배 품목</p>
          <CheckboxDropdown
            label="재배 품목 선택"
            options={[
              ...new Set([
                ...vegetables.map((item) => item.name),
                ...farm.crops,
              ]),
            ].map((name) => ({ value: name, label: name }))}
            selected={crops}
            onChange={setCrops}
            showAll={false}
          />
          {crops.length > 0 && (
            <p className="mt-2 text-sm text-brand">{crops.join(" · ")}</p>
          )}
        </div>
        <fieldset className="space-y-4 border-t border-line pt-5">
          <legend className="pr-3 text-lg font-bold">농가 이야기</legend>
          <label className="block text-sm font-bold">
            한 줄 소개
            <input
              name="headline"
              defaultValue={detail?.headline ?? farm.story ?? ""}
              required
              maxLength={500}
              placeholder="농가를 소개하는 한 문장을 입력해 주세요"
              className={field}
            />
          </label>
          {storyFields.map(({ key, label }) => (
            <label key={key} className="block text-sm font-bold">
              {label}
              <textarea
                name={key}
                defaultValue={detail?.[key] ?? ""}
                required
                maxLength={3000}
                rows={key === "quote" ? 2 : 3}
                placeholder={`${label} 내용을 입력해 주세요`}
                className={field}
              />
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-4 rounded-card border border-line p-4">
          <legend className="px-2 text-base font-bold">농가 위치</legend>
          <label className="block text-sm font-bold">
            상세 주소
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              required
              maxLength={300}
              placeholder="도로명 주소와 건물번호까지 입력해 주세요"
              className={field}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">
              위도 (선택)
              <input
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                inputMode="decimal"
                placeholder="예: 34.573"
                className={field}
              />
            </label>
            <label className="text-sm font-bold">
              경도 (선택)
              <input
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                inputMode="decimal"
                placeholder="예: 126.599"
                className={field}
              />
            </label>
          </div>
          <label className="block text-sm font-bold">
            Google 지도 퍼가기 주소 (선택)
            <input
              type="url"
              value={embedUrl}
              onChange={(event) => setEmbedUrl(event.target.value)}
              placeholder="https://www.google.com/maps/embed?pb=…"
              className={field}
            />
          </label>
          <p className="text-xs text-ink-muted">
            상세 주소로 위치를 미리 확인하세요. 핀을 정확하게 지정하려면
            위도·경도 또는 Google 지도의 ‘공유 → 지도 퍼가기’에 있는 src 주소를
            입력하세요.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const result = parseFarmLocation(
                address,
                latitude,
                longitude,
                embedUrl,
              );
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setError("");
              setPreview(result.value);
            }}
          >
            지도 미리보기
          </button>
          <FarmLocationMap name={farm.farmName} {...preview} />
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-3 border-t border-line pt-5">
          <button
            type="button"
            onClick={discard.requestClose}
            className="btn btn-secondary flex-1"
          >
            취소
          </button>
          <button disabled={reading} className="btn btn-primary flex-1">
            {reading ? "이미지 확인 중…" : creating ? "농가 등록" : "저장"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
