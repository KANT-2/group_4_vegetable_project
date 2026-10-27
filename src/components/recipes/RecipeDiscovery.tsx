"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";
import type { RankedRecipe } from "@/services/recipe-rankings";

type Guide = { id: string; name: string; imageUrl?: string };

export function RecipeDiscovery({ vegetables }: { vegetables: Guide[] }) {
  const [ranking, setRanking] = useState<RankedRecipe[] | null>(null);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/recipe-rankings", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("rankings");
        const data = await response.json();
        if (
          !Array.isArray(data.items) ||
          data.items.some(
            (item: RankedRecipe) =>
              !item ||
              typeof item.id !== "string" ||
              typeof item.name !== "string" ||
              !Number.isSafeInteger(item.views) ||
              item.views < 0,
          )
        )
          throw new Error("invalid rankings");
        if (!controller.signal.aborted) {
          setRanking(data.items);
          setFailed(false);
        }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      }
    };
    void refresh();
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
      <section
        aria-label="실시간 인기 레시피"
        className="flex min-w-0 flex-1 flex-col gap-3 rounded-card bg-brand-soft px-4 py-4 sm:flex-row sm:items-center sm:gap-4 lg:px-5"
      >
        <h2 className="flex shrink-0 items-center gap-2 text-sm font-extrabold text-brand-dark">
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M2 10h4v8H2zm6-7h4v15H8zm6 4h4v11h-4z" />
          </svg>
          실시간 인기 레시피
        </h2>
        {ranking && ranking.length > 0 ? (
          <ol className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
            {ranking.map((recipe, index) => (
              <li
                key={recipe.id}
                className="min-w-0 sm:border-l sm:border-line sm:pl-3"
              >
                <Link
                  href={`/recipes/${recipe.id}`}
                  prefetch={false}
                  className="group flex min-h-12 items-center gap-2 rounded-control focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className="w-4 shrink-0 text-xl font-extrabold text-brand-dark">
                    {index + 1}
                  </span>
                  <SafeImage
                    src={recipe.imageUrl}
                    alt={`${recipe.name} 요리 사진`}
                    className="h-11 w-11 shrink-0 rounded-control object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold group-hover:text-brand-dark">
                      {recipe.name}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {recipe.views.toLocaleString("ko-KR")}회
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p role="status" className="text-sm text-ink-muted">
            {failed
              ? "순위를 불러오지 못했어요."
              : ranking
                ? "아직 조회된 레시피가 없어요."
                : "인기 레시피 집계 중"}
          </p>
        )}
      </section>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-full border border-brand bg-white px-5 text-sm font-semibold text-brand-dark hover:bg-brand-soft lg:self-auto"
        aria-haspopup="dialog"
      >
        <svg
          aria-hidden="true"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M20 4C10 3 4 8 4 14a6 6 0 0 0 6 6c6 0 10-6 10-16Z" />
          <path d="m5 19 10-10" />
        </svg>
        보관 · 손질법
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={title}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card border border-line bg-white p-5 shadow-xl backdrop:bg-black/30 sm:p-6"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id={title} className="text-xl font-extrabold text-brand-dark">
              채소 보관 · 손질법
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              궁금한 채소를 선택해 주세요.
            </p>
          </div>
          <form method="dialog">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-ink-muted hover:bg-sand"
              aria-label="채소 보관·손질법 닫기"
            >
              ×
            </button>
          </form>
        </header>
        <ul className="mt-5 grid grid-cols-3 gap-3">
          {vegetables.map((vegetable) => (
            <li key={vegetable.id}>
              <a
                href={`/vegetables/${vegetable.id}`}
                onClick={() => dialog.current?.close()}
                className="block overflow-hidden rounded-control border border-line bg-white hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
              >
                <SafeImage
                  src={vegetable.imageUrl}
                  alt={vegetable.name}
                  className="aspect-[4/3] w-full object-cover"
                />
                <span className="flex items-center justify-between gap-1 px-2 py-2 text-sm font-bold">
                  <span>{vegetable.name}</span>
                  <span
                    aria-hidden="true"
                    className="font-normal text-ink-muted"
                  >
                    ›
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </dialog>
    </div>
  );
}
