"use client";

import { useId, useRef, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";
import { recipeImageError } from "@/lib/recipe-image-validation";

export function RecipeImagePicker({
  images,
  onChange,
  onReading,
  label = "레시피 이미지",
  maxImages = 3,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  onReading: (reading: boolean) => void;
  label?: string;
  maxImages?: number;
}) {
  const id = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const activeRead = useRef(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold">
        {label} ({images.length}/{maxImages})
      </label>
      <input
        id={id}
        type="file"
        multiple={maxImages > 1}
        accept="image/jpeg,image/png,image/webp"
        disabled={busy || images.length >= maxImages}
        className="mt-2 block w-full rounded-control border border-line p-2 text-sm file:mr-3 file:rounded-control file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand disabled:opacity-50"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (!files.length || activeRead.current) return;
          const message = recipeImageError(images.length, files, maxImages);
          setError(message);
          if (message) return;
          activeRead.current = true;
          setBusy(true);
          onReading(true);
          try {
            const urls = await Promise.all(
              files.map(
                (file) =>
                  new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(String(reader.result));
                    reader.onerror = () => reject(new Error("read"));
                    reader.readAsDataURL(file);
                  }),
              ),
            );
            onChange([...images, ...urls]);
          } catch {
            setError("이미지를 읽지 못했습니다. 다시 선택해 주세요.");
          } finally {
            activeRead.current = false;
            setBusy(false);
            onReading(false);
          }
        }}
      />
      <p className="mt-2 text-xs text-ink-muted">
        최대 {maxImages}장 · JPG·PNG·WebP · 한 장당 최대 5MB. 첫 번째 이미지가
        대표 사진입니다.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {busy && (
        <p role="status" className="mt-2 text-sm">
          이미지를 확인하고 있어요.
        </p>
      )}
      <div
        className={`mt-3 grid gap-3 ${maxImages === 1 ? "grid-cols-1" : "grid-cols-3"}`}
      >
        {images.map((image, index) => (
          <div key={image + index} className="relative">
            <SafeImage
              src={image}
              alt={`${label} ${index + 1}`}
              className={`${maxImages === 1 ? "aspect-[3/1]" : "aspect-square"} w-full rounded-card object-cover`}
            />
            <button
              type="button"
              disabled={busy}
              aria-label={`${index + 1}번째 이미지 삭제`}
              onClick={() => {
                onChange(
                  images.filter((_, imageIndex) => index !== imageIndex),
                );
                setError("");
              }}
              className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-white text-xl shadow"
            >
              ×
            </button>
            <p className="mt-1 text-center text-xs text-ink-muted">
              {index === 0 ? "대표 이미지" : `${index + 1}번째 이미지`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
