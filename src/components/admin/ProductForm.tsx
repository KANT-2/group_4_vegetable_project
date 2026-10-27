"use client";

import { useId, useRef, useState } from "react";
import { z } from "zod";
import { VEGETABLE_CATEGORY_LABELS } from "@/types/vegetable";
import type { VegetableCategory } from "@/types/vegetable";
import { SafeImage } from "@/components/common/SafeImage";
import { products } from "@/data/mock/products";
import { vegetables } from "@/data/mock/vegetables";
import { UGLY_REASON_LABELS, type UglyReason } from "@/types/product";

const schema = z.object({
  id: z
    .string()
    .trim()
    .min(1, "상품 ID를 입력해 주세요.")
    .max(100)
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "상품 ID는 영문 소문자·숫자와 하이픈(-)만 사용할 수 있습니다. 예: carrot-bent-1kg",
    ),
  name: z.string().trim().min(1, "상품명을 입력해 주세요.").max(100),
  unit: z.string().trim().min(1, "용량을 입력해 주세요.").max(100),
  region: z.string().trim().min(1, "지역을 입력해 주세요.").max(100),
  farmName: z.string().trim().min(1, "농가명을 입력해 주세요.").max(100),
  vegetableId: z
    .string({ message: "채소를 선택해 주세요." })
    .min(1, "채소를 선택해 주세요."),
  uglyReason: z.enum(["small", "bent", "scratched", "irregular"], {
    message: "못난이 이유를 선택해 주세요.",
  }),
  price: z
    .string()
    .regex(/^\d+$/, "가격은 정수로 입력해 주세요.")
    .transform(Number)
    .pipe(
      z.number().int().min(1, "가격은 1원 이상이어야 합니다.").max(2147483647),
    ),
  category: z.enum([
    "root",
    "leaf",
    "fruit_veg",
    "mushroom",
    "fruit",
    "seasoning",
  ]),
  status: z.enum(["active", "soldout", "inactive"]),
  stock: z.coerce
    .number()
    .int()
    .min(0, "재고는 0개 이상이어야 합니다.")
    .max(1000000),
});
export type RegisteredProduct = {
  id: string;
  name: string;
  unit: string;
  region: string;
  farmName: string;
  vegetableId: string;
  uglyReason: UglyReason;
  price: number;
  category: VegetableCategory;
  status: "active" | "soldout" | "inactive";
  stock: number;
  imageUrl: string;
};
const inputClass =
  "mt-2 min-h-12 w-full rounded-control border border-line bg-white px-3 text-base font-normal";

export function ProductForm({
  initial,
  existingIds,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial?: RegisteredProduct;
  existingIds: string[];
  onSubmit: (product: RegisteredProduct) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const imageId = useId();
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(initial?.imageUrl ?? "");
  const [reading, setReading] = useState(false);
  const imageRead = useRef(0);
  // 종류를 고르면 그 종류의 채소만 고를 수 있어요. (상품은 DB 에서 채소에 연결돼요)
  const [category, setCategory] = useState<string>(initial?.category ?? "");
  const farmOptions = [
    ...new Set(products.map((product) => product.farmName)),
  ].sort((a, b) => a.localeCompare(b, "ko"));
  const farmListId = useId();
  const regionOptions = [
    ...new Set(
      [
        ...products.map((product) => product.farmRegion),
        initial?.region,
      ].filter((region): region is string => Boolean(region)),
    ),
  ].sort((a, b) => a.localeCompare(b, "ko"));
  return (
    <form
      className="@container"
      ref={form}
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = schema.safeParse(
          Object.fromEntries(new FormData(event.currentTarget)),
        );
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        if (
          existingIds.some(
            (id) => id.toLowerCase() === parsed.data.id.toLowerCase(),
          )
        ) {
          setError("이미 등록된 상품 ID입니다. 다른 ID를 입력해 주세요.");
          return;
        }
        if (!preview || reading) {
          setError(
            "상품 이미지를 선택하고 미리보기가 표시될 때까지 기다려 주세요.",
          );
          return;
        }
        onSubmit({
          ...parsed.data,
          stock: parsed.data.status === "soldout" ? 0 : parsed.data.stock,
          imageUrl: preview,
        });
      }}
    >
      <div className="grid gap-5 @min-[480px]:grid-cols-2">
        <label className="text-sm font-bold">
          상품 ID
          <input
            name="id"
            defaultValue={initial?.id}
            // 등록된 상품의 ID는 주문 기록과 이어져 있어 바꿀 수 없어요.
            readOnly={Boolean(initial)}
            aria-describedby={initial ? `${imageId}-id-note` : undefined}
            required
            maxLength={100}
            placeholder="예: carrot-bent-1kg"
            className={`${inputClass} read-only:bg-sand read-only:text-ink-muted`}
          />
          {initial && (
            <span
              id={`${imageId}-id-note`}
              className="mt-2 block text-xs font-normal text-ink-muted"
            >
              등록된 상품 ID는 바꿀 수 없어요.
            </span>
          )}
        </label>
        <label className="text-sm font-bold">
          상품명
          <input
            name="name"
            defaultValue={initial?.name}
            required
            maxLength={100}
            placeholder="예: 흙당근"
            className={inputClass}
          />
        </label>
        <div className="@min-[480px]:col-span-2">
          <label htmlFor={imageId} className="block text-sm font-bold">
            이미지
          </label>
          <div className="mt-2 flex items-center gap-4">
            <input
              id={imageId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!initial}
              className={`block min-h-12 min-w-0 rounded-control border border-line p-2 text-sm file:mr-3 file:rounded-control file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand ${!initial && preview ? "w-[min(60%,22rem)] flex-none" : "w-full flex-1"}`}
              onChange={async (event) => {
                const version = ++imageRead.current;
                const file = event.target.files?.[0];
                setPreview(initial?.imageUrl ?? "");
                setError("");
                setReading(false);
                if (!file) return;
                if (
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    file.type,
                  ) ||
                  file.size > 5 * 1024 * 1024
                ) {
                  setError(
                    "이미지는 JPG·PNG·WebP 형식으로 5MB 이하만 선택해 주세요.",
                  );
                  event.target.value = "";
                  return;
                }
                setReading(true);
                const reader = new FileReader();
                reader.onload = () => {
                  if (imageRead.current === version) {
                    setPreview(String(reader.result));
                    setReading(false);
                  }
                };
                reader.onerror = () => {
                  if (imageRead.current === version) {
                    setError("이미지를 읽지 못했습니다. 다시 선택해 주세요.");
                    setReading(false);
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
            {preview && (
              <SafeImage
                src={preview}
                alt="등록할 상품 미리보기"
                className={`shrink-0 rounded-card object-contain ${initial ? "size-20 sm:size-24" : "size-28 sm:size-40"}`}
              />
            )}
          </div>
          <p className="mt-1 text-xs text-ink-muted">JPG·PNG·WebP, 최대 5MB.</p>
        </div>
        <label className="text-sm font-bold">
          용량
          <input
            name="unit"
            defaultValue={initial?.unit}
            required
            maxLength={100}
            placeholder="예: 1kg (5~8개)"
            className={inputClass}
          />
        </label>
        <label className="text-sm font-bold">
          종류
          <select
            name="category"
            required
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              종류 선택
            </option>
            {Object.entries(VEGETABLE_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          채소
          <select
            key={category}
            name="vegetableId"
            required
            defaultValue={
              vegetables.some(
                (vegetable) =>
                  vegetable.id === initial?.vegetableId &&
                  vegetable.category === category,
              )
                ? initial?.vegetableId
                : ""
            }
            disabled={!category}
            className={inputClass}
          >
            <option value="" disabled>
              {category ? "채소 선택" : "종류를 먼저 선택"}
            </option>
            {vegetables
              .filter((vegetable) => vegetable.category === category)
              .map((vegetable) => (
                <option key={vegetable.id} value={vegetable.id}>
                  {vegetable.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          못난이 이유
          <select
            name="uglyReason"
            required
            defaultValue={initial?.uglyReason ?? ""}
            className={inputClass}
          >
            <option value="" disabled>
              이유 선택
            </option>
            {Object.entries(UGLY_REASON_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          농가명
          <input
            name="farmName"
            defaultValue={initial?.farmName}
            required
            maxLength={100}
            list={farmListId}
            placeholder="예: 해남 김씨농장"
            className={inputClass}
          />
          <datalist id={farmListId}>
            {farmOptions.map((farm) => (
              <option key={farm} value={farm} />
            ))}
          </datalist>
        </label>
        <label className="text-sm font-bold">
          지역
          <select
            name="region"
            defaultValue={initial?.region ?? ""}
            required
            className={inputClass}
          >
            <option value="" disabled>
              지역 선택
            </option>
            {regionOptions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold">
          가격 (원)
          <input
            name="price"
            defaultValue={initial?.price}
            inputMode="numeric"
            required
            placeholder="예: 3900"
            className={inputClass}
          />
        </label>
        <label className="text-sm font-bold">
          재고 수량 (개)
          <input
            name="stock"
            type="number"
            min={0}
            max={1000000}
            step={1}
            required
            defaultValue={initial?.stock ?? 100}
            className={inputClass}
          />
          <span className="mt-2 block text-xs font-normal text-ink-muted">
            0개이면 고객 화면에 품절로 표시됩니다.
          </span>
        </label>
        <label className="text-sm font-bold">
          판매 상태
          <select
            name="status"
            defaultValue={initial?.status ?? "active"}
            onChange={(event) => {
              const input = form.current?.elements.namedItem(
                "stock",
              ) as HTMLInputElement | null;
              if (input && event.target.value === "soldout") input.value = "0";
              if (
                input &&
                event.target.value === "active" &&
                Number(input.value) === 0
              )
                input.value = "1";
            }}
            className={inputClass}
          >
            <option value="active">판매 중</option>
            <option value="soldout">품절 (고객 화면에 표시)</option>
            <option value="inactive">판매 중지</option>
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-7 flex justify-end gap-3 border-t border-line pt-5">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          취소
        </button>
        <button disabled={reading} className="btn btn-primary">
          {reading ? "이미지 확인 중…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
