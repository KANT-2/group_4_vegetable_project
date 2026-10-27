"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MyReview } from "@/types/review";

export function ProductReviewLink({
  items,
}: {
  items: { product_id: string; product_name: string }[];
}) {
  const [product, setProduct] = useState(items[0]?.product_id ?? "");
  const [mine, setMine] = useState<MyReview | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews/mine?${new URLSearchParams({ product_id: product })}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(setMine)
      .catch(() => {});
    return () => controller.abort();
  }, [product]);
  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-3 xl:ml-0">
      {items.length > 1 && (
        <select
          aria-label="리뷰를 작성할 주문 상품"
          className="max-w-40 rounded-lg border border-line bg-white p-2 text-xs"
          value={product}
          onChange={(event) => {
            setProduct(event.target.value);
            setMine(null);
          }}
        >
          {items.map((item) => (
            <option key={item.product_id} value={item.product_id}>
              {item.product_name}
            </option>
          ))}
        </select>
      )}
      <span
        className={`whitespace-nowrap text-xs ${mine ? "text-green-700" : "text-ink-muted"}`}
      >
        {mine?.deleted_at ? "삭제됨" : mine ? "작성 완료" : "미작성"}
      </span>
      <Link
        href={`/products/${encodeURIComponent(product)}#reviews`}
        className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-control border border-brand/30 bg-brand-soft px-4 text-sm font-semibold text-brand-dark"
      >
        {mine ? "리뷰 보기" : "리뷰 작성"}
      </Link>
    </div>
  );
}
