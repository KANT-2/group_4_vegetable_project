"use client";

// 메인 상품 진열 줄 (A 담당, v2 시안 · 마켓컬리 기준)
// 가운데 제목(28px) + 회색 설명 → 4개씩 보이는 가로 줄 → 오른쪽(넘긴 뒤엔 왼쪽) 동그란 화살표
// 카드가 잘려 보이지 않게 휴대폰 2장·태블릿 3장·데스크톱 4장이 딱 맞게 보여요.
// 손가락으로 밀어서 넘기고, 넘길 게 있으면 모든 화면에서 ‹ › 화살표가 보여요.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SectionHeading } from "./SectionHeading";

export function HomeShelf({
  id,
  eyebrow,
  title,
  sub,
  href,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  href?: string | null;
  children: ReactNode; // <li> 목록
}) {
  const rowRef = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    const max = row.scrollWidth - row.clientWidth;
    setEdge({ left: row.scrollLeft > 4, right: row.scrollLeft < max - 4 });
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    measure();
    row.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => {
      row.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  const move = (direction: 1 | -1) => {
    const row = rowRef.current;
    row?.scrollBy({
      left: direction * (row.clientWidth + 18),
      behavior: "smooth",
    });
  };

  // 휴대폰·태블릿은 카드 안쪽 가장자리에 작게, 넓은 화면은 바깥에 크게
  const arrow =
    "absolute top-[5rem] z-10 flex size-10 items-center justify-center rounded-full bg-surface text-2xl text-ink shadow-[0_0_6px_rgb(0_0_0_/_0.12)] hover:text-brand sm:top-[6.5rem] lg:top-[8.125rem] lg:size-15 lg:text-3xl";

  return (
    <section aria-labelledby={id} className="container-page pt-10 md:pt-14">
      <SectionHeading
        id={id}
        eyebrow={eyebrow}
        title={title}
        sub={sub}
        href={href}
      />

      <div className="relative">
        <ul
          ref={rowRef}
          className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] sm:-mx-6 sm:gap-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:gap-[18px] lg:overflow-x-hidden lg:px-0 [&::-webkit-scrollbar]:hidden [&>li]:w-[calc((100%-16px)/2)] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[calc((100%-48px)/3)] lg:[&>li]:w-[calc((100%-54px)/4)]"
        >
          {children}
        </ul>
        {edge.left && (
          <button
            type="button"
            aria-label={`${title} 앞쪽 보기`}
            onClick={() => move(-1)}
            className={`${arrow} -left-2 lg:-left-7.5`}
          >
            ‹
          </button>
        )}
        {edge.right && (
          <button
            type="button"
            aria-label={`${title} 더 보기`}
            onClick={() => move(1)}
            className={`${arrow} -right-2 lg:-right-7.5`}
          >
            ›
          </button>
        )}
      </div>
    </section>
  );
}
