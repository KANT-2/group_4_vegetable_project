"use client";

import { useEffect, useRef } from "react";
import { FilterChevron } from "./FilterChevron";

export function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
  showAll = true,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
  showAll?: boolean;
}) {
  const container = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        container.current &&
        !container.current.contains(event.target as Node)
      )
        container.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <details
      ref={container}
      className="relative w-44 shrink-0"
      onKeyDown={(event) => {
        if (event.key === "Escape" && container.current) {
          container.current.open = false;
          container.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary className="flex h-12 cursor-pointer list-none items-center justify-between gap-5 rounded-control border border-line bg-white px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span>
          {label}
          {selected.length > 0 && (
            <span className="ml-2 text-brand">{selected.length}개</span>
          )}
        </span>
        <FilterChevron />
      </summary>
      <fieldset className="absolute top-full left-0 z-20 mt-2 max-h-80 w-60 max-w-[calc(100vw-40px)] overflow-y-auto rounded-card border border-line bg-white p-2 shadow-lg">
        <legend className="sr-only">{label} 필터</legend>
        {showAll && (
          <>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-3 text-sm hover:bg-brand-soft">
              <input
                type="checkbox"
                checked={selected.length === 0}
                onChange={() => onChange([])}
                className="size-4 accent-brand"
              />
              전체
            </label>
            <div className="my-1 border-t border-line" />
          </>
        )}
        {options.map((option) => (
          <label
            key={option.value}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-3 text-sm hover:bg-brand-soft"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((value) => value !== option.value),
                )
              }
              className="size-4 accent-brand"
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </details>
  );
}
