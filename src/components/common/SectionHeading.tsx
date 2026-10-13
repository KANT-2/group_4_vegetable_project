// 구역 제목 (A 담당): 모든 화면의 가운데 제목을 같은 모양으로 맞춰요.
//   작은 영문 라벨(주황) → 굵은 제목 (+ 더보기 동그란 화살표) → 회색 설명
// 이모지는 기기마다 모양이 달라 제목에 쓰지 않아요.

import Link from "next/link";
import { ArrowRightIcon } from "./Icons";

export function SectionHeading({
  id,
  eyebrow,
  title,
  sub,
  href,
  className = "mb-5 md:mb-7",
}: {
  id?: string;
  eyebrow?: string; // 예: "SEASONAL"
  title: string;
  sub?: string;
  href?: string | null;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      {eyebrow && (
        <p className="mb-1.5 text-xs font-bold tracking-[0.14em] text-brand md:text-[0.8125rem]">
          {eyebrow}
        </p>
      )}
      <h2
        id={id}
        className="text-[1.375rem] font-extrabold leading-tight tracking-[-0.02em] text-ink md:text-[1.75rem]"
      >
        {href ? (
          <Link
            href={href}
            className="group inline-flex items-center gap-2 hover:text-brand"
          >
            {title}
            <span
              aria-hidden="true"
              className="inline-flex size-7 items-center justify-center rounded-full border border-line text-ink-muted transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-white md:size-8"
            >
              <ArrowRightIcon width={16} height={16} />
            </span>
          </Link>
        ) : (
          title
        )}
      </h2>
      {sub && <p className="mt-2 text-sm text-ink-muted md:text-base">{sub}</p>}
    </div>
  );
}
