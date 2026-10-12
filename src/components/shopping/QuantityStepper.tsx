"use client";

import { MAX_CART_QUANTITY } from "@/schemas/cart";

// − 수량 + . 버튼은 손가락으로 누르기 쉽게 48px 이에요.
export function QuantityStepper({
  value,
  onChange,
  disabled = false,
  label,
  compact = false,
}: {
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
  compact?: boolean;
}) {
  const button = `inline-flex ${compact ? "h-12 w-10" : "size-12"} items-center justify-center text-xl font-bold text-ink hover:bg-sand disabled:text-ink-muted disabled:hover:bg-transparent`;
  return (
    <div
      role="group"
      aria-label={`${label} 수량`}
      className="inline-flex items-center overflow-hidden rounded-control border border-field-border bg-surface"
    >
      <button
        type="button"
        className={button}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label="수량 1개 줄이기"
      >
        −
      </button>
      <span
        className={`${compact ? "min-w-7" : "min-w-10"} text-center font-bold tabular-nums`}
        aria-live="polite"
      >
        {value}
        <span className="sr-only">개</span>
      </span>
      <button
        type="button"
        className={button}
        disabled={disabled || value >= MAX_CART_QUANTITY}
        onClick={() => onChange(value + 1)}
        aria-label="수량 1개 늘리기"
      >
        +
      </button>
    </div>
  );
}
