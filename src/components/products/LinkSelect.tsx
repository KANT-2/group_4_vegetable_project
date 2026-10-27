"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

// 고르면 그 항목의 주소로 이동하는 드롭다운 (정렬·못난이 이유). 주소 계산은 서버가 미리 해 줘요.
export function LinkSelect({
  label,
  value,
  options,
  className = "",
}: {
  label: string; // 화면 읽기용 이름
  value: string;
  options: { value: string; label: string; href: string }[];
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        aria-busy={pending}
        onChange={(event) => {
          const next = options.find(
            (option) => option.value === event.target.value,
          );
          if (next)
            startTransition(() => router.push(next.href, { scroll: false }));
        }}
        className={`min-h-10 rounded-control border border-line bg-surface py-1.5 pl-3.5 pr-8 text-sm font-semibold text-ink ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
