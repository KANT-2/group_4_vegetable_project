"use client";

import { useState } from "react";
import { SafeImage } from "./SafeImage";
import { useManagedFarm } from "./FarmManagedDetails";

export function FarmManagedGallery({
  farmId,
  name,
  fallback,
}: {
  farmId: string;
  name: string;
  fallback: string;
}) {
  const farm = useManagedFarm(farmId);
  const [index, setIndex] = useState(0);
  const images = farm
    ? [farm.imageUrl, ...(farm.additionalImageUrls ?? [])]
        .filter(Boolean)
        .slice(0, 3)
    : [fallback];
  return (
    <div>
      <SafeImage
        src={images[index % images.length]}
        alt={`${farm?.farmName ?? name} 농가 사진`}
        priority
        className="aspect-[4/5] w-full rounded-control object-cover"
      />
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {images.map((image, imageIndex) => (
            <button
              type="button"
              key={image + imageIndex}
              onClick={() => setIndex(imageIndex)}
              aria-label={`${imageIndex + 1}번째 농가 사진 보기`}
              aria-pressed={index % images.length === imageIndex}
              className={`overflow-hidden rounded-control border-2 ${index % images.length === imageIndex ? "border-brand" : "border-transparent"}`}
            >
              <SafeImage
                src={image}
                alt=""
                className="aspect-square w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
