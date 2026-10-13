"use client";

import { useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";

export function ProductImageRotator({
  images,
  name,
  className,
  priority = false,
}: {
  images: string[];
  name: string;
  className?: string;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = index % (images.length || 1);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(element);
    const link = element.closest("a");
    const focus = () => setFocused(true);
    const blur = () => setFocused(false);
    link?.addEventListener("focus", focus);
    link?.addEventListener("blur", blur);
    return () => {
      observer.disconnect();
      link?.removeEventListener("focus", focus);
      link?.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    if (images.length < 2 || hovered || focused || !visible) return;
    const timer = window.setInterval(() => {
      if (
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      setIndex((previous) => (previous + 1) % images.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [images.length, hovered, focused, visible]);

  return (
    <div
      ref={root}
      className="relative"
      data-product-image-index={current + 1}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      {images.length > 1 ? (
        // 레시피 사진(RecipeImage)과 같은 방식: 사진을 겹쳐 두고 0.7초 동안 서서히 바꿔요.
        // 모든 사진을 미리 불러 두어 바뀔 때 빈 화면이 보이지 않아요.
        images.map((src, photoIndex) => (
          <div
            key={src}
            aria-hidden={photoIndex !== current}
            className={`transition-opacity duration-700 ease-in-out ${photoIndex === 0 ? "relative" : "absolute inset-0"} ${photoIndex === current ? "opacity-100" : "opacity-0"}`}
          >
            <SafeImage
              src={src}
              alt={`${name} 사진 ${photoIndex + 1}`}
              className={`${className ?? ""} ${photoIndex === 0 ? "" : "h-full"}`}
              priority={priority && photoIndex === 0}
            />
          </div>
        ))
      ) : (
        <SafeImage
          src={images[0]}
          alt={`${name} 사진`}
          className={className}
          priority={priority}
        />
      )}
    </div>
  );
}
