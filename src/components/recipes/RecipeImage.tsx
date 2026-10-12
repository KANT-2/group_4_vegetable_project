"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";
import type { Recipe } from "@/types/recipe";

interface RecipeImageProps {
  recipe: Pick<
    Recipe,
    "name" | "imageUrl" | "additionalImageUrls" | "vegetables" | "imageAlt"
  >;
  className?: string;
  priority?: boolean;
  href?: string;
}

export function RecipeImage({
  recipe,
  className = "",
  priority,
  href,
}: RecipeImageProps) {
  const [index, setIndex] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const photos = [
    ...new Set(
      [recipe.imageUrl, ...(recipe.additionalImageUrls ?? [])].filter(
        (src): src is string => Boolean(src),
      ),
    ),
  ];
  const multiple = photos.length > 1;
  const current = index % (photos.length || 1);
  const substituteUrl = recipe.vegetables.find(
    (vegetable) => vegetable.imageUrl,
  )?.imageUrl;
  const isSubstitute = photos.length === 0 && Boolean(substituteUrl);

  useEffect(() => {
    if (!multiple || interacting) return;
    const timer = window.setInterval(() => {
      // 백그라운드 탭과 동작 줄이기 설정에서는 자동 넘김을 멈춥니다.
      if (
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      setIndex((previous) => (previous + 1) % photos.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [multiple, photos.length, interacting]);

  const image = (
    <SafeImage
      src={photos[current] ?? substituteUrl}
      alt={
        recipe.imageAlt ??
        (isSubstitute
          ? `${recipe.name} 재료 사진`
          : `${recipe.name} 사진${multiple ? ` ${current + 1}` : ""}`)
      }
      className={className}
      priority={priority}
      placeholderText="요리 사진 준비 중"
    />
  );

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      {href ? (
        <Link href={href} className="block">
          {image}
        </Link>
      ) : (
        image
      )}
      {isSubstitute && (
        <span className="chip absolute bottom-3 left-3 bg-surface/95 text-bark">
          재료 사진 · 요리 사진 준비 중
        </span>
      )}
    </div>
  );
}
