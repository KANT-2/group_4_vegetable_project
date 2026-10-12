"use client";

import { useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";

export function ProductGallery({
  images,
  name,
  badge,
}: {
  images: string[];
  name: string;
  badge?: string;
}) {
  const [index, setIndex] = useState(0);
  const current = index % (images.length || 1);
  const go = (direction: number) =>
    setIndex(
      (previous) => (previous + direction + images.length) % images.length,
    );
  return (
    <section
      aria-label={`${name} 상품 사진`}
      aria-roledescription="캐러셀"
      className="min-w-0"
      data-gallery-index={current + 1}
      onKeyDown={(event) => {
        if (images.length < 2) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(-1);
        }
      }}
    >
      <div className="relative aspect-square overflow-hidden rounded-card bg-sand">
        <SafeImage
          src={images[current]}
          alt={`${name} 사진 ${current + 1}`}
          className="absolute inset-0 h-full w-full object-cover"
          priority
        />
        {badge && (
          <span className="absolute left-3 top-3 rounded-full bg-surface/90 px-3 py-1 text-sm font-semibold text-brand-dark">
            {badge}
          </span>
        )}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="이전 상품 사진"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-2xl text-brand-dark shadow-sm"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="다음 상품 사진"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white/90 text-2xl text-brand-dark shadow-sm"
            >
              ›
            </button>
          </>
        )}
        <span
          aria-live="polite"
          className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white"
        >
          {current + 1} / {images.length}
        </span>
      </div>
      {images.length > 1 && (
        <div
          className="mt-3 grid grid-cols-3 gap-3"
          aria-label="상품 사진 선택"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`상품 사진 ${i + 1} 보기`}
              aria-pressed={i === current}
              onClick={() => setIndex(i)}
              className={`aspect-square min-h-11 overflow-hidden rounded-lg border-2 p-0.5 ${i === current ? "border-brand" : "border-transparent hover:border-line"}`}
            >
              <SafeImage
                src={src}
                alt=""
                className="size-full rounded-md object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
