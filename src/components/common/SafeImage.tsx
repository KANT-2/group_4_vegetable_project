"use client";

// 이미지가 없거나 불러오지 못해도 레이아웃이 깨지지 않게 대체 화면을 보여주는 이미지
// 대체 화면은 외부 이미지 없이 그려져서 항상 보여요.

import { useState } from "react";
import { LeafIcon } from "./Icons";

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  placeholderText?: string;
}

export function SafeImage({
  src,
  alt,
  className = "",
  priority = false,
  placeholderText = "이미지 준비 중",
}: SafeImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div
        role="img"
        aria-label={`${alt} (${placeholderText})`}
        className={`flex flex-col items-center justify-center gap-2 bg-sand text-bark ${className}`}
      >
        <LeafIcon width={32} height={32} />
        <span className="text-sm font-bold">{placeholderText}</span>
      </div>
    );
  }

  return (
    // 로컬 정적 이미지와 Supabase Storage 주소를 모두 쓰므로 next/image 대신 기본 img 를 사용해요.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
      ref={(element) => {
        // 하이드레이션 전에 이미 실패한 이미지도 대체 화면으로 바꿔요.
        if (element && element.complete && element.naturalWidth === 0)
          setFailedSrc(src);
      }}
      onError={() => setFailedSrc(src)}
    />
  );
}
