"use client";

import { useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";

export function ZoomableRecipePhoto({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <button
      type="button"
      aria-label={`${alt} ${zoomed ? "축소" : "확대"}`}
      aria-pressed={zoomed}
      onClick={() => setZoomed((previous) => !previous)}
      className="block w-full cursor-zoom-in overflow-hidden rounded-control aria-pressed:cursor-zoom-out"
    >
      <SafeImage
        src={src}
        alt={alt}
        priority
        className={`aspect-[3/4] w-full object-cover transition-transform duration-500 ease-out md:aspect-auto md:h-[clamp(22rem,52svh,36rem)] hover:scale-110 ${zoomed ? "scale-110" : "scale-100"}`}
      />
    </button>
  );
}
