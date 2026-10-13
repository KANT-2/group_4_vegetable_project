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
      <SafeImage
        src={images[current]}
        alt={`${name} 사진 ${current + 1}`}
        className={className}
        priority={priority}
      />
    </div>
  );
}
