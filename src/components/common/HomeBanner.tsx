"use client";

// 메인 맨 위 화면 너비 사진 배너 (A 담당, v2 시안 · 마켓컬리 기준)
// 사진 위에 글자를 얹고, 오른쪽 아래에 "1 / 5" 와 멈춤 버튼, 마우스를 올리면 좌우 화살표가 보여요.
// 홈은 3초, 기본은 5초마다 넘어가고, 호버·포커스·동작 줄이기에서는 멈춰요.

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SafeImage } from "./SafeImage";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export interface HomeBannerSlide {
  id: string;
  href: string;
  imageUrl?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  highlight?: string; // 예: "38% 15,900원"
  // photo: 가로로 긴 사진을 화면 가득 / split: 연한 배경 + 오른쪽 정사각형 사진 (상품 사진처럼 가로 사진이 없을 때)
  layout?: "photo" | "split" | "artwork";
  cta?: string;
}

export function HomeBanner({
  slides,
  intervalMs = 5000,
}: {
  slides: HomeBannerSlide[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );

  const go = useCallback(
    (delta: number) =>
      setIndex((i) => (i + delta + slides.length) % slides.length),
    [slides.length],
  );

  const moving =
    !paused && !hovered && !focused && !reducedMotion && slides.length > 1;
  useEffect(() => {
    if (!moving) return;
    const timer = window.setInterval(() => go(1), intervalMs);
    return () => window.clearInterval(timer);
  }, [moving, go, intervalMs]);

  if (slides.length === 0) return null;

  const artwork = slides.every((slide) => slide.layout === "artwork");

  const arrow =
    "absolute top-1/2 z-10 hidden size-13 -translate-y-1/2 items-center justify-center rounded-full bg-ink/25 text-3xl text-white transition-opacity hover:bg-ink/40 focus-visible:flex group-hover:flex lg:flex lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100";

  return (
    <section
      aria-label="기획전 배너"
      aria-roledescription="캐러셀"
      className={`group relative w-full overflow-hidden bg-sand ${artwork ? "h-72 sm:aspect-[3/1] sm:h-auto" : "h-[clamp(15rem,52vw,23.125rem)]"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      {slides.map((slide, i) => {
        const current = i === index;
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="슬라이드"
            aria-label={`${i + 1} / ${slides.length}`}
            aria-hidden={!current}
            inert={!current}
            className={`absolute inset-0 transition-opacity duration-700 ${current ? "opacity-100" : "opacity-0"}`}
          >
            <Link
              href={slide.href}
              aria-label={
                slide.layout === "artwork"
                  ? `${slide.eyebrow}: ${slide.title}. ${slide.sub ?? ""} ${slide.cta ?? ""}`
                  : undefined
              }
              className={`block size-full ${slide.layout === "split" ? "bg-brand-soft" : ""}`}
            >
              {slide.layout === "artwork" ? (
                <>
                  <Image
                    src={slide.imageUrl ?? "/images/hero.jpg"}
                    alt=""
                    fill
                    sizes="100vw"
                    preload={i === 0}
                    loading={i === 0 ? undefined : "eager"}
                    className="object-cover object-right sm:object-center"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/60 to-transparent sm:hidden"
                  />
                </>
              ) : slide.layout === "split" ? (
                // 오른쪽 정사각형 사진: 본문 폭(1050px) 오른쪽 끝에 맞춰요.
                <span className="container-page relative flex h-full justify-end">
                  <SafeImage
                    src={slide.imageUrl}
                    alt=""
                    priority={i === 0}
                    className="h-full w-1/2 object-cover sm:aspect-square sm:w-auto"
                  />
                </span>
              ) : (
                <>
                  <SafeImage
                    src={slide.imageUrl}
                    alt=""
                    priority={i === 0}
                    className="absolute inset-0 size-full object-cover"
                  />
                  {/* 글자가 잘 읽히도록 왼쪽만 어둡게 */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent"
                  />
                </>
              )}
              <span
                aria-hidden={slide.layout === "artwork" ? true : undefined}
                className={`container-page absolute inset-x-0 inset-y-0 flex flex-col justify-center ${slide.layout === "artwork" ? "text-white sm:hidden" : slide.layout === "split" ? "pr-[52%] text-ink sm:pr-[24rem]" : "text-white"}`}
              >
                <span className="text-sm font-medium opacity-90 md:text-base">
                  {slide.eyebrow}
                </span>
                <span className="mt-2 max-w-[18ch] whitespace-pre-line text-[1.75rem] font-bold leading-tight md:text-[2.5rem]">
                  {slide.title}
                </span>
                {slide.sub && (
                  <span className="mt-2 text-sm opacity-90 md:text-lg">
                    {slide.sub}
                  </span>
                )}
                {slide.cta && (
                  <span className="mt-4 inline-flex w-fit rounded-full bg-surface px-4 py-1.5 text-sm font-bold text-ink">
                    {slide.cta} ›
                  </span>
                )}
                {slide.highlight && (
                  <span className="mt-4 inline-flex w-fit rounded-full bg-surface px-4 py-1.5 text-base font-bold text-ink md:text-lg">
                    {slide.highlight}
                  </span>
                )}
              </span>
            </Link>
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            aria-label="이전 배너"
            onClick={() => go(-1)}
            className={`${arrow} left-[max(1rem,calc(50%-36rem))]`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="다음 배너"
            onClick={() => go(1)}
            className={`${arrow} right-[max(1rem,calc(50%-36rem))]`}
          >
            ›
          </button>
          <div className="container-page pointer-events-none absolute inset-x-0 bottom-4 flex justify-end">
            <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-ink/30 py-0.5 pl-1 pr-3 text-xs text-white">
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "배너 자동 넘김 시작" : "배너 멈춤"}
                className="flex size-7 items-center justify-center"
              >
                {paused ? "▶" : "❚❚"}
              </button>
              <span aria-live="polite">
                <b className="font-bold">
                  {String(index + 1).padStart(2, "0")}
                </b>{" "}
                / {String(slides.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
