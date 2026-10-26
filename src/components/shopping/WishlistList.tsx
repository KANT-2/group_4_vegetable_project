"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setWishlist } from "@/actions/cart";
import { HeartIcon } from "@/components/common/Icons";
import { SafeImage } from "@/components/common/SafeImage";
import type { WishlistLine } from "@/lib/cart";
import { formatPrice, getDiscountRate } from "@/lib/format";
import { useLoginReturn } from "./useLoginReturn";
import { useNavigation } from "@/components/common/NavigationProvider";

// 찜 목록: 상품 이름(또는 사진)을 누르면 상품 페이지로, 하트를 누르면 찜 해제돼요.
export function WishlistList({
  initialLines,
}: {
  initialLines: WishlistLine[];
}) {
  const [lines, setLines] = useState(initialLines);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const goLogin = useLoginReturn();
  const { refresh } = useNavigation();

  const unwish = (line: WishlistLine) => {
    if (busy) return; // 중복 클릭 방지
    setBusy(line.productId);
    setErrors((prev) => ({ ...prev, [line.productId]: "" }));
    startTransition(async () => {
      try {
        const result = await setWishlist({
          product_id: line.productId,
          wished: false,
        });
        if (!result.ok) {
          if (result.needsLogin) return goLogin();
          setErrors((prev) => ({ ...prev, [line.productId]: result.error }));
          return;
        }
        setLines((prev) => prev.filter((l) => l.productId !== line.productId));
        await refresh();
      } catch {
        setErrors((prev) => ({
          ...prev,
          [line.productId]:
            "찜을 해제하지 못했어요. 연결 상태를 확인해 주세요.",
        }));
      } finally {
        setBusy(null);
      }
    });
  };

  if (!lines.length)
    return (
      <div className="card flex flex-col items-center p-10 text-center">
        <HeartIcon
          width={56}
          height={56}
          fill="currentColor"
          stroke="none"
          className="text-line"
        />
        <h2 className="mt-4 text-lg font-bold">아직 찜한 상품이 없어요</h2>
        <p className="mt-1 text-sm text-ink-muted">
          찜해두면 헤매지 않고 금방 찾을 수 있어요.
        </p>
        <Link href="/products" className="btn btn-primary mt-6">
          상품 둘러보기
        </Link>
      </div>
    );

  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="찜한 상품">
      {lines.map((line) => {
        const rate = getDiscountRate(line.price, line.originalPrice);
        const href = line.available ? `/products/${line.productId}` : null;
        const image = (
          <div className="size-20 shrink-0 overflow-hidden rounded-control bg-sand sm:size-24">
            <SafeImage
              src={line.imageUrl}
              alt={line.name}
              className="h-full w-full object-cover"
              placeholderText="사진 없음"
            />
          </div>
        );
        return (
          <li
            key={line.productId}
            className="card relative flex gap-4 p-4 pr-16"
            aria-busy={busy === line.productId}
          >
            {href ? (
              <Link href={href} tabIndex={-1} aria-hidden>
                {image}
              </Link>
            ) : (
              image
            )}
            <div className="min-w-0 flex-1 self-center">
              {href ? (
                <Link
                  href={href}
                  className="font-bold hover:underline underline-offset-4"
                >
                  {line.name}
                </Link>
              ) : (
                <p className="font-bold text-ink-muted">{line.name}</p>
              )}
              {line.available ? (
                <p className="mt-1 text-sm">
                  {rate > 0 && (
                    <span className="mr-1 font-bold text-accent">{rate}%</span>
                  )}
                  <span className="font-bold">{formatPrice(line.price)}</span>
                  <span className="text-ink-muted"> · {line.unit}</span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-muted">
                  지금은 판매하지 않는 상품이에요.
                </p>
              )}
              {errors[line.productId] && (
                <p role="alert" className="field-error">
                  {errors[line.productId]}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => unwish(line)}
              disabled={!!busy}
              aria-pressed="true"
              aria-label={`${line.name} 찜 해제`}
              title="찜 해제"
              className="absolute right-2 top-2 inline-flex size-12 items-center justify-center rounded-full text-danger hover:bg-danger-soft disabled:opacity-50"
            >
              <HeartIcon
                width={28}
                height={28}
                fill="currentColor"
                stroke="none"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
