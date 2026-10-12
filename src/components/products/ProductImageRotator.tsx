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
  const [interacting, setInteracting] = useState(false);
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
    const focus = () => setInteracting(true);
    const blur = () => setInteracting(false);
    link?.addEventListener("focus", focus);
    link?.addEventListener("blur", blur);
    return () => {
      observer.disconnect();
      link?.removeEventListener("focus", focus);
      link?.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    if (images.length < 2 || interacting || !visible) return;
    const timer = window.setInterval(() => {
      if (
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      setIndex((previous) => (previous + 1) % images.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [images.length, interacting, visible]);

  return (
    <div
      ref={root}
      className="relative"
      data-product-image-index={current + 1}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      <SafeImage
        src={images[current]}
        alt={`${name} 사진 ${current + 1}`}
        className={className}
        priority={priority}
      />
      {images.length > 1 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/20 px-2 py-1.5"
        >
          {images.map((image, i) => (
            <span
              key={image}
              className={`h-1.5 rounded-full ${i === current ? "w-4 bg-white" : "w-1.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
