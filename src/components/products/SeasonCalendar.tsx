"use client";

// 상품 목록 위 "제철 채소" 가로 띠 (2026-10-26 시안 A)
// 이번 달부터 세 달 중 하나를 고르면 그 달이 제철인 채소를 보여 줘요.
// 제철 정보는 채소 데이터의 season("9~12월" 등)에서 계산해 서버가 넘겨줘요.
// 채소를 누르면 그 채소 상품만 보여요(다시 누르면 해제).
// 채소가 많아 넘치면 스크롤바 대신 양쪽 ‹ › 버튼으로 넘겨요(손가락으로 밀어도 돼요).

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SafeImage } from "@/components/common/SafeImage";

export type SeasonVegetable = {
  id: string;
  name: string;
  imageUrl?: string;
  months: number[];
};

export function SeasonCalendar({
  vegetables,
  startMonth,
  selected,
  hrefFor,
}: {
  vegetables: SeasonVegetable[];
  startMonth: number; // 이번 달 (1~12, 한국 시간)
  selected?: string; // 지금 고른 채소 id
  hrefFor: Record<string, string>; // 채소 id → 누르면 갈 주소 (고른 채소는 해제 주소)
}) {
  const months = [0, 1, 2].map(
    (offset) => ((startMonth - 1 + offset) % 12) + 1,
  );
  const [month, setMonth] = useState(months[0]);
  const inSeason = vegetables.filter((vegetable) =>
    vegetable.months.includes(month),
  );

  // 가려진 쪽에만 화살표를 보여 줘요. 달을 바꾸면 처음으로 돌아가 다시 재요.
  const listRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const measure = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const max = list.scrollWidth - list.clientWidth;
    setEdge({ left: list.scrollLeft > 4, right: list.scrollLeft < max - 4 });
  }, []);
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollLeft = 0;
    measure();
    list.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => {
      list.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure, month]);
  const move = (direction: 1 | -1) => {
    const list = listRef.current;
    list?.scrollBy({
      left: direction * list.clientWidth * 0.7,
      behavior: "smooth",
    });
  };
  const arrow =
    "absolute top-1/2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-ink shadow-md hover:text-brand";

  return (
    <section
      aria-labelledby="season-calendar-title"
      className="flex flex-col gap-4 rounded-card border border-brand/15 bg-brand-soft px-5 py-4 md:flex-row md:items-center md:gap-7 md:px-6"
    >
      <div className="shrink-0 md:w-44">
        <h2
          id="season-calendar-title"
          className="text-[1.0625rem] font-extrabold text-ink"
        >
          {month}월 제철 채소
        </h2>
        <div role="group" aria-label="달 선택" className="mt-3 flex gap-1.5">
          {months.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={value === month}
              onClick={() => setMonth(value)}
              className={`min-h-8 rounded-full px-3 text-sm font-bold transition-colors ${
                value === month
                  ? "bg-brand text-white"
                  : "bg-white text-ink-muted hover:text-brand-dark"
              }`}
            >
              {value}월
            </button>
          ))}
        </div>
      </div>

      {inSeason.length > 0 ? (
        // 넓은 화면은 한 줄에 고르게, 넘치면 ‹ › 버튼이나 손가락으로 넘겨요.
        <div className="relative min-w-0 flex-1">
          <ul
            ref={listRef}
            aria-live="polite"
            aria-label={`${month}월 제철 채소`}
            className="flex gap-3 overflow-x-auto [scrollbar-width:none] md:justify-between [&::-webkit-scrollbar]:hidden"
          >
            {inSeason.map((vegetable) => (
              <li key={vegetable.id} className="shrink-0">
                <Link
                  href={hrefFor[vegetable.id]}
                  scroll={false}
                  aria-current={selected === vegetable.id ? "true" : undefined}
                  aria-label={
                    selected === vegetable.id
                      ? `${vegetable.name} 상품만 보기 해제`
                      : `${vegetable.name} 상품만 보기`
                  }
                  className="group flex w-16 flex-col items-center gap-1.5 text-center"
                >
                  <SafeImage
                    src={vegetable.imageUrl}
                    alt=""
                    placeholderText=""
                    className={`size-12 rounded-full border-2 object-cover shadow-sm transition-transform group-hover:scale-105 ${
                      selected === vegetable.id
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-white"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold group-hover:text-brand-dark ${
                      selected === vegetable.id ? "text-brand-dark" : "text-ink"
                    }`}
                  >
                    {vegetable.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {edge.left && (
            <button
              type="button"
              aria-label="앞쪽 제철 채소 보기"
              onClick={() => move(-1)}
              className={`${arrow} -left-2`}
            >
              <Chevron flip />
            </button>
          )}
          {edge.right && (
            <button
              type="button"
              aria-label="다음 제철 채소 보기"
              onClick={() => move(1)}
              className={`${arrow} -right-2`}
            >
              <Chevron />
            </button>
          )}
        </div>
      ) : (
        <p aria-live="polite" className="text-sm text-ink-muted">
          {month}월이 제철인 채소를 준비하고 있어요.
        </p>
      )}
    </section>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={"size-4" + (flip ? " rotate-180" : "")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
