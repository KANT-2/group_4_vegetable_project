"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReviewPage } from "@/types/review";
import { reviewDate } from "@/components/products/ProductReviews";

export function MyProductReviews() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReviewPage | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews/mine/list?page=${page}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<ReviewPage>;
      })
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("작성한 리뷰를 불러오지 못했어요. 새로고침해 주세요.");
      });
    return () => controller.abort();
  }, [page]);
  return (
    <section className="mb-8" aria-labelledby="my-written-reviews">
      <h2 id="my-written-reviews" className="mb-4 text-lg font-bold">
        작성한 리뷰 {data ? `(${data.total})` : ""}
      </h2>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : !data ? (
        <p className="text-sm text-ink-muted">리뷰를 불러오고 있어요.</p>
      ) : !data.items.length ? (
        <p className="rounded-xl border border-line bg-white p-8 text-center text-sm text-ink-muted">
          아직 작성한 리뷰가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {data.items.map((review) => (
            <li
              key={review.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{review.product_name}</p>
                <p className="mt-2 text-xs text-ink-muted">
                  {reviewDate(review.created_at)} · {"★".repeat(review.rating)}
                  {review.image_count > 0
                    ? ` · 사진 ${review.image_count}장`
                    : ""}
                </p>
                <p className="mt-3 line-clamp-2 break-words text-sm">
                  {review.content}
                </p>
                {review.deleted_at && (
                  <p className="mt-2 text-xs text-danger">
                    관리자 삭제 · {review.deletion_reason}
                  </p>
                )}
              </div>
              <span className="text-xs text-green-700">작성 완료</span>
              <Link
                href={`/products/${review.product_id}#reviews`}
                className="btn btn-secondary"
              >
                리뷰 보기
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && data.total > 12 && (
        <nav
          aria-label="나의 리뷰 페이지"
          className="mt-4 flex justify-center gap-4"
        >
          <button
            className="btn btn-secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            이전
          </button>
          <span>
            {page} / {Math.ceil(data.total / 12)}
          </span>
          <button
            className="btn btn-secondary"
            disabled={page >= Math.ceil(data.total / 12)}
            onClick={() => setPage(page + 1)}
          >
            다음
          </button>
        </nav>
      )}
    </section>
  );
}
