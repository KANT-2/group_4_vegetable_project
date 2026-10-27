"use client";

import { useEffect, useRef, useState } from "react";
import type { AdminPromotion } from "@/lib/admin-store";
import { promotionKindLabels, safePromotionHref } from "@/lib/admin-promotions";
import { RecipeImagePicker } from "./RecipeImagePicker";
import { useUnsavedDialog } from "./useUnsavedDialog";

const field =
  "mt-2 min-h-12 w-full rounded-control border border-line bg-white px-3 py-2 text-base font-normal";
type Pair = [string, string];

function PairFields({
  title,
  rows,
  onChange,
  placeholders,
  cards = false,
}: {
  title: string;
  rows: Pair[];
  onChange: (rows: Pair[]) => void;
  placeholders: Pair;
  cards?: boolean;
}) {
  return (
    <fieldset className={cards ? "grid gap-4 sm:grid-cols-3" : "space-y-3"}>
      <legend className="mb-3 font-bold">{title}</legend>
      {rows.map((row, index) => (
        <div
          key={index}
          className={
            cards
              ? "relative rounded-card bg-sand p-4 pt-10"
              : "flex items-start gap-2 border-b border-line pb-3"
          }
        >
          {cards && (
            <p className="mb-3 text-xs font-bold text-brand">
              STEP {String(index + 1).padStart(2, "0")}
            </p>
          )}
          <div
            className={
              cards ? "space-y-2" : "grid flex-1 gap-2 sm:grid-cols-[1fr_2fr]"
            }
          >
            {row.map((value, column) => (
              <input
                key={column}
                className={field}
                value={value}
                aria-label={`${title} ${index + 1} ${placeholders[column]}`}
                placeholder={placeholders[column]}
                maxLength={column === 0 ? 80 : 500}
                onChange={(event) =>
                  onChange(
                    rows.map((item, i) =>
                      i === index
                        ? column === 0
                          ? [event.target.value, item[1]]
                          : [item[0], event.target.value]
                        : item,
                    ),
                  )
                }
              />
            ))}
          </div>
          <button
            type="button"
            className={
              cards
                ? "absolute top-1 right-1 min-h-9 min-w-9 text-ink-muted"
                : "mt-2 min-h-12 min-w-10 text-ink-muted"
            }
            aria-label={`${title} ${index + 1} 삭제`}
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="min-h-11 font-semibold text-brand"
        onClick={() => onChange([...rows, ["", ""]])}
      >
        + 항목 추가
      </button>
    </fieldset>
  );
}

export function PromotionEditDialog({
  item,
  onSave,
  onClose,
}: {
  item: AdminPromotion | null;
  onSave: (item: AdminPromotion) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const discard = useUnsavedDialog(dialog);
  const [images, setImages] = useState(item?.image ? [item.image] : []);
  const [reading, setReading] = useState(false);
  const [facts, setFacts] = useState<Pair[]>(item?.facts ?? [["", ""]]);
  const [steps, setSteps] = useState<Pair[]>(item?.steps ?? [["", ""]]);
  const [error, setError] = useState("");
  const [kind, setKind] = useState<AdminPromotion["kind"]>(
    item?.kind ?? "coupon",
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={discard.onCancel}
      onClose={onClose}
      aria-labelledby="promotion-form-title"
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-6xl overflow-y-auto rounded-card border border-line bg-white p-6 shadow-xl backdrop:bg-black/25 sm:p-8"
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 id="promotion-form-title" className="text-2xl font-bold">
          {item ? "혜택 · 이벤트 수정" : "혜택 · 이벤트 등록하기"}
        </h2>
        <button
          type="button"
          onClick={discard.requestClose}
          aria-label="입력창 닫기"
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
          const value = (name: string) => String(data.get(name) ?? "").trim();
          if (!images.length) {
            setError("배너 이미지를 등록해 주세요.");
            return;
          }
          const href = value("productHref");
          if (href && !safePromotionHref(href)) {
            setError(
              "연결 주소는 /products처럼 사이트 내부 주소를 입력해 주세요.",
            );
            return;
          }
          const pairs = [...facts, ...steps];
          if (pairs.some(([a, b]) => Boolean(a.trim()) !== Boolean(b.trim()))) {
            setError("안내 항목의 제목과 내용을 함께 입력해 주세요.");
            return;
          }
          if (!["title", "label", "description"].every((name) => value(name))) {
            setError("제목, 분류명, 소개를 입력해 주세요.");
            return;
          }
          const id = item?.id ?? `notice-${crypto.randomUUID()}`;
          onSave({
            ...item,
            id,
            slug: item?.slug ?? id,
            name: value("title"),
            title: value("title"),
            label: value("label"),
            kind: value("kind") as AdminPromotion["kind"],
            description: value("description"),
            image: images[0],
            benefit: value("benefit"),
            benefitLabel: value("benefitLabel"),
            facts: facts
              .filter(([a, b]) => a.trim() && b.trim())
              .map(([a, b]) => [a.trim(), b.trim()]),
            steps: steps
              .filter(([a, b]) => a.trim() && b.trim())
              .map(([a, b]) => [a.trim(), b.trim()]),
            notes: value("notes")
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean),
            productHref: href,
            productLabel: value("productLabel") || "자세히 보기",
            published: value("published") === "true",
          });
        }}
      >
        <RecipeImagePicker
          images={images}
          onChange={setImages}
          onReading={setReading}
          label="배너 이미지"
          maxImages={1}
        />
        <p className="text-sm text-ink-muted">
          고객 목록 배너는 가로 3:1 비율의 이미지를 권장해요.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block font-bold">
            종류
            <select
              name="kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as AdminPromotion["kind"])
              }
              className={field}
            >
              {Object.entries(promotionKindLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block font-bold">
            노출 상태
            <select
              name="published"
              defaultValue={String(item?.published ?? true)}
              className={field}
            >
              <option value="true">공개</option>
              <option value="false">비공개</option>
            </select>
          </label>
        </div>
        <label className="block font-bold">
          목록에 표시할 제목
          <input
            name="title"
            required
            maxLength={100}
            defaultValue={item?.title}
            className={field}
          />
        </label>
        <label className="block font-bold">
          공지 소개
          <textarea
            name="description"
            required
            maxLength={2000}
            defaultValue={item?.description}
            rows={3}
            className={field}
          />
        </label>
        <section className="border-t border-line pt-8">
          <p className="text-center text-xs font-semibold tracking-widest text-brand">
            {kind === "coupon"
              ? "A LITTLE GIFT"
              : kind === "delivery"
                ? "FRESH TO YOUR TABLE"
                : "FAMILY MOMENTS"}
          </p>
          <h3 className="mt-3 mb-6 text-center text-2xl font-bold">
            {kind === "coupon"
              ? "장보기가 더 즐거워지는 혜택"
              : kind === "delivery"
                ? "수도권 당일 배송, 미리 확인하세요"
                : "우리 가족의 특별한 토요일"}
          </h3>
          <div className="overflow-hidden rounded-2xl border border-line md:grid md:grid-cols-[.8fr_1.2fr]">
            <div className="space-y-4 border-b border-dashed border-brand/30 bg-brand-soft p-6 text-center md:border-r md:border-b-0">
              <label className="block text-sm font-bold text-brand">
                혜택 이름
                <input
                  name="label"
                  required
                  maxLength={40}
                  defaultValue={item?.label}
                  placeholder="예: 오픈런 쿠폰"
                  className={`${field} text-center text-brand`}
                />
              </label>
              <label className="block text-sm font-bold text-brand">
                크게 표시할 혜택
                <input
                  name="benefit"
                  maxLength={60}
                  defaultValue={item?.benefit}
                  placeholder="예: 2,000원"
                  className={`${field} text-center text-3xl font-bold text-brand`}
                />
              </label>
              <label className="block text-sm font-bold">
                혜택 아래 설명
                <input
                  name="benefitLabel"
                  maxLength={120}
                  defaultValue={item?.benefitLabel}
                  placeholder="예: 아침 장보기 할인"
                  className={`${field} text-center`}
                />
              </label>
              {kind === "coupon" && (
                <div className="pt-2">
                  <span className="inline-block rounded-control bg-brand px-5 py-3 font-bold text-white">
                    쿠폰 받기
                  </span>
                  <p className="mt-2 text-xs text-ink-muted">
                    고객 화면의 쿠폰 버튼 위치
                  </p>
                </div>
              )}
            </div>
            <div className="p-5 sm:p-6">
              <PairFields
                title="상세 안내"
                rows={facts}
                onChange={setFacts}
                placeholders={["항목명", "안내 내용"]}
              />
            </div>
          </div>
        </section>
        <PairFields
          title="이용 방법 · 진행 순서"
          cards
          rows={steps}
          onChange={setSteps}
          placeholders={["단계 제목", "설명"]}
        />
        <label className="block font-bold">
          유의사항
          <textarea
            name="notes"
            defaultValue={item?.notes.join("\n")}
            maxLength={5000}
            rows={4}
            placeholder="한 줄에 하나씩 입력해 주세요."
            className={field}
          />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block font-bold">
            연결 버튼 이름
            <input
              name="productLabel"
              maxLength={60}
              defaultValue={item?.productLabel}
              placeholder="예: 상품 보러 가기"
              className={field}
            />
          </label>
          <label className="block font-bold">
            연결 주소
            <input
              name="productHref"
              defaultValue={item?.productHref}
              placeholder="예: /products"
              className={field}
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-3 border-t border-line pt-5">
          <button
            type="button"
            className="btn flex-1 border border-line"
            onClick={discard.requestClose}
          >
            취소
          </button>
          <button
            type="submit"
            disabled={reading}
            className="btn btn-primary flex-1"
          >
            {reading ? "이미지 읽는 중…" : item ? "저장" : "등록"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
