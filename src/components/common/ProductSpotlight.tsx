"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SafeImage } from "./SafeImage";

interface Slide {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  unit: string;
  tagline?: string;
  isSeasonal: boolean;
}
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
export function ProductSpotlight({
  products,
  home = false,
}: {
  products: Slide[];
  home?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);
  const reduce = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );
  const moving = !paused && !interacting && !reduce && visible;
  useEffect(() => {
    if (!moving || products.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % products.length),
      5000,
    );
    return () => window.clearInterval(timer);
  }, [moving, products.length]);
  if (!products.length) return null;
  const active = index % products.length;
  const go = (delta: number) =>
    setIndex((i) => (i + delta + products.length) % products.length);
  return (
    <section
      aria-label="제철 과일 자동 슬라이드"
      aria-roledescription="캐러셀"
      data-play-state={moving ? "playing" : "paused"}
      className="overflow-hidden rounded-[1.75rem] border border-line bg-sand"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false);
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      tabIndex={0}
      onPointerDown={(e) => {
        swiped.current = false;
        if (e.pointerType === "touch") startX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (startX.current !== null) {
          const diff = e.clientX - startX.current;
          if (Math.abs(diff) > 50) {
            swiped.current = true;
            go(diff < 0 ? 1 : -1);
          }
          startX.current = null;
        }
      }}
      onPointerCancel={() => {
        startX.current = null;
      }}
      onClickCapture={(e) => {
        if (swiped.current) {
          e.preventDefault();
          swiped.current = false;
        }
      }}
      style={{ touchAction: "pan-y" }}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-in-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {products.map((product, i) => {
            const discount = Math.round(
              (1 - product.price / product.originalPrice) * 100,
            );
            return (
              <div
                key={product.id}
                aria-hidden={i !== active}
                inert={i !== active}
                className="w-full shrink-0"
                role="group"
                aria-roledescription="슬라이드"
                aria-label={`${i + 1} / ${products.length}`}
              >
                <div className="grid md:min-h-[32rem] md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:min-h-[36rem]">
                  <div className="relative order-1 h-[clamp(18rem,78vw,26rem)] bg-brand-soft sm:h-96 md:order-2 md:h-full">
                    <SafeImage
                      src={product.imageUrl}
                      alt={product.name}
                      priority={i === 0}
                      className="absolute inset-0 size-full object-cover"
                    />
                    <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-3 py-1 text-sm font-bold text-brand-dark">
                      {product.isSeasonal
                        ? "제철을 담았어요"
                        : "모양만 다른 맛있는 발견"}
                    </span>
                  </div>
                  <div className="order-2 flex flex-col justify-center p-6 sm:p-8 md:order-1 md:p-8 lg:p-10">
                    <p className="text-sm font-bold text-brand-dark">
                      {home
                        ? "못난이마켓의 제철 과일"
                        : "지금 맛있는 제철 과일"}
                    </p>
                    <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                      {product.name}
                    </h2>
                    <p className="mt-2 text-sm text-ink-muted md:text-base">
                      {product.tagline ||
                        "모양은 자유롭게, 식탁은 더 풍성하게."}
                    </p>
                    <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-2xl font-black text-accent">
                        {discount}%
                      </span>
                      <span className="text-3xl font-black lg:text-4xl">
                        {product.price.toLocaleString("ko-KR")}원
                      </span>
                      <del className="text-sm text-ink-muted">
                        {product.originalPrice.toLocaleString("ko-KR")}원
                      </del>
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {product.unit}
                    </p>
                    <Link
                      href={`/products/${product.id}`}
                      className="btn btn-primary mt-5 self-start"
                    >
                      이 상품 만나보기 →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface/70 px-3 py-2 sm:px-5">
        <div className="flex gap-1">
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              aria-label={`${i + 1}번 상품 보기`}
              aria-pressed={i === active}
              onClick={() => setIndex(i)}
              className="flex size-10 items-center justify-center"
            >
              <span
                className={`h-2 rounded-full transition-all motion-reduce:transition-none ${i === active ? "w-6 bg-brand" : "w-2 bg-line"}`}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-xs tabular-nums text-ink-muted">
            {active + 1} / {products.length}
          </span>
          <button
            type="button"
            className="size-10 rounded-full hover:bg-sand"
            aria-label="이전 추천 상품"
            onClick={() => go(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="size-10 rounded-full hover:bg-sand"
            aria-label={paused || reduce ? "자동 재생 시작" : "자동 재생 정지"}
            disabled={reduce}
            onClick={() => {
              setPaused(!paused);
              if (paused) setInteracting(false);
            }}
          >
            {paused || reduce ? "▶" : "Ⅱ"}
          </button>
          <button
            type="button"
            className="size-10 rounded-full hover:bg-sand"
            aria-label="다음 추천 상품"
            onClick={() => go(1)}
          >
            ›
          </button>
        </div>
      </div>
      <details className="bg-surface/70 px-5 pb-3 text-xs text-ink-muted">
        <summary className="cursor-pointer py-1">제철 과일 선정 기준</summary>
        <p className="pt-1">
          제철로 표시된 판매 중 과일을 할인율순으로 보여드려요. 제철 여부는 상품
          정보 기준이에요.
        </p>
      </details>
    </section>
  );
}
