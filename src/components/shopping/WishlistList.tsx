"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { addToCart, setWishlist } from "@/actions/cart";
import { SafeImage } from "@/components/common/SafeImage";
import { useNavigation } from "@/components/common/NavigationProvider";
import type { WishlistLine } from "@/lib/cart";
import { formatPrice, getDiscountRate } from "@/lib/format";
import { useLoginReturn } from "./useLoginReturn";

export function WishlistList({
  initialLines,
}: {
  initialLines: WishlistLine[];
}) {
  const [lines, setLines] = useState(initialLines);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<
    Record<string, { kind: "ok" | "error"; text: string }>
  >({});
  const [, startTransition] = useTransition();
  const { refresh } = useNavigation();
  const goLogin = useLoginReturn();

  const note = (id: string, kind: "ok" | "error", text: string) =>
    setNotes((prev) => ({ ...prev, [id]: { kind, text } }));

  const act = (line: WishlistLine, kind: "cart" | "remove") => {
    if (busy) return;
    setBusy(line.productId);
    startTransition(async () => {
      try {
        const result =
          kind === "cart"
            ? await addToCart({ product_id: line.productId, quantity: 1 })
            : await setWishlist({ product_id: line.productId, wished: false });
        if (!result.ok) {
          if (result.needsLogin) return goLogin();
          note(line.productId, "error", result.error);
          return;
        }
        if (kind === "remove")
          setLines((prev) =>
            prev.filter((l) => l.productId !== line.productId),
          );
        else {
          note(line.productId, "ok", "장바구니에 1개 담았어요.");
          void refresh();
        }
      } catch {
        note(
          line.productId,
          "error",
          "저장하지 못했어요. 연결 상태를 확인해 주세요.",
        );
      } finally {
        setBusy(null);
      }
    });
  };

  if (!lines.length)
    return (
      <div className="card p-6 text-center">
        <h2 className="text-xl font-bold">찜한 상품이 없어요</h2>
        <p className="mt-3 text-ink-muted">
          상품 화면의 ♡ 버튼을 누르면 여기에 모아 둘 수 있어요.
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
        const n = notes[line.productId];
        return (
          <li
            key={line.productId}
            className="card flex gap-4 p-4"
            aria-busy={busy === line.productId}
          >
            <div className="size-20 shrink-0 overflow-hidden rounded-control bg-sand">
              <SafeImage
                src={line.imageUrl}
                alt={line.name}
                className="h-full w-full object-cover"
                placeholderText="사진 없음"
              />
            </div>
            <div className="min-w-0 flex-1">
              {line.available ? (
                <Link
                  href={`/products/${line.productId}`}
                  className="font-bold hover:underline"
                >
                  {line.name}
                </Link>
              ) : (
                <p className="font-bold text-ink-muted">{line.name}</p>
              )}
              {line.available && (
                <p className="text-sm">
                  {rate > 0 && (
                    <span className="mr-1 font-bold text-accent">{rate}%</span>
                  )}
                  <span className="font-bold">{formatPrice(line.price)}</span>
                  <span className="text-ink-muted"> · {line.unit}</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {line.available && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={!!busy}
                    onClick={() => act(line, "cart")}
                  >
                    장바구니 담기
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={!!busy}
                  onClick={() => act(line, "remove")}
                  aria-label={`${line.name} 찜 해제`}
                >
                  찜 해제
                </button>
              </div>
              {n && (
                <p
                  role={n.kind === "error" ? "alert" : "status"}
                  className={
                    n.kind === "error"
                      ? "field-error"
                      : "mt-2 text-sm font-semibold text-brand-dark"
                  }
                >
                  {n.text}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
