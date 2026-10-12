"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// 옆으로 넘기는 줄: 손가락·마우스로 밀기 + 끝이 가려진 쪽에 ‹ › 화살표
// 내용이 화면에 다 들어가면 화살표를 숨겨요.
export default function ScrollRow({
  label,
  className = "",
  children,
}: {
  label: string; // 화면 읽기용 이름 (예: "분류")
  className?: string; // 줄 안쪽 배치 (gap, 큰 화면 줄바꿈 등)
  children: React.ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
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
      left: direction * row.clientWidth * 0.7,
      behavior: "smooth",
    });
  };

  const arrow =
    "absolute top-0 flex h-12 w-12 items-center text-ink hover:text-brand-dark";

  return (
    <div className="relative">
      <div
        ref={rowRef}
        className={
          "flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
          className
        }
      >
        {children}
      </div>

      {edge.left && (
        <button
          type="button"
          aria-label={`${label} 앞쪽 보기`}
          onClick={() => move(-1)}
          className={`${arrow} left-0 justify-start bg-gradient-to-r from-canvas from-50% to-transparent pl-1`}
        >
          <Chevron flip />
        </button>
      )}
      {edge.right && (
        <button
          type="button"
          aria-label={`${label} 더 보기`}
          onClick={() => move(1)}
          className={`${arrow} right-0 justify-end bg-gradient-to-l from-canvas from-50% to-transparent pr-1`}
        >
          <Chevron />
        </button>
      )}
    </div>
  );
}

function Chevron({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={"h-5 w-5" + (flip ? " rotate-180" : "")}
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
