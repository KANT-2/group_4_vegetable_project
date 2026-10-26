"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Review, ReviewPage } from "@/types/review";
import { reviewDate, reviewImage } from "@/components/products/ProductReviews";

export function AdminReviews() {
  const [data, setData] = useState<ReviewPage>({
    items: [],
    total: 0,
    page: 1,
    size: 12,
  });
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("visible");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);
  const [reason, setReason] = useState("욕설·비방 등 부적절한 내용");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/admin/api/reviews?${new URLSearchParams({ q: query, status, page: String(page) })}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            typeof body.detail === "string"
              ? body.detail
              : "리뷰를 불러오지 못했습니다.",
          );
        return body as ReviewPage;
      })
      .then((result) => {
        setData(result);
        setLoading(false);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(
            e instanceof Error ? e.message : "리뷰 조회에 실패했습니다.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [query, status, page, version]);

  async function moderate(review: Review, action: "delete" | "restore") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/admin/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, action, reason }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          typeof body.detail === "string"
            ? body.detail
            : "처리하지 못했습니다.",
        );
      }
      dialog.current?.close();
      setSelected(null);
      refresh();
      setNotice(
        action === "delete"
          ? "리뷰가 삭제되어 고객 화면에서 숨겨졌습니다."
          : "리뷰를 복원했습니다.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p className="mt-3 text-sm text-ink-muted">
        상품과 관계없는 내용이나 부적절한 후기를 검토하고 관리하세요. 삭제한
        리뷰는 고객에게 공개되지 않으며 복원할 수 있습니다.
      </p>
      <form
        className="my-6 flex flex-wrap gap-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
          setPage(1);
          setLoading(true);
          refresh();
        }}
      >
        <label htmlFor="admin-review-search" className="sr-only">
          상품명 또는 리뷰 내용 검색
        </label>
        <input
          id="admin-review-search"
          className="field min-w-0 flex-1"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={100}
          placeholder="상품명 또는 리뷰 내용 검색"
        />
        <label className="sr-only" htmlFor="admin-review-status">
          리뷰 공개 상태
        </label>
        <select
          id="admin-review-status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
            setLoading(true);
          }}
          className="field"
        >
          <option value="visible">공개 중</option>
          <option value="deleted">삭제됨</option>
          <option value="all">전체</option>
        </select>
        <button type="submit" className="btn btn-primary">
          검색
        </button>
        <button type="button" className="btn btn-secondary" onClick={refresh}>
          새로고침
        </button>
      </form>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-brand/20 bg-brand-soft p-4 text-sm text-brand-dark"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="my-5 rounded-xl bg-danger-soft p-4 text-sm text-danger"
        >
          {error}{" "}
          <button type="button" onClick={refresh} className="underline">
            다시 시도
          </button>{" "}
          <Link href="/admin/login" className="ml-3 underline">
            관리자 로그인
          </Link>
        </p>
      )}
      <p className="mb-4 text-sm text-ink-muted">
        총 <strong className="text-ink">{data.total}개</strong> 리뷰 · 최신순
      </p>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {loading ? (
          <p role="status" className="p-12 text-center text-ink-muted">
            리뷰를 불러오고 있습니다.
          </p>
        ) : !error && !data.items.length ? (
          <p className="p-16 text-center text-sm text-ink-muted">
            해당하는 리뷰가 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {data.items.map((review) => (
              <li key={review.id} className="p-5 sm:p-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/products/${review.product_id}#reviews`}
                      className="font-bold hover:text-brand"
                    >
                      {review.product_name}
                    </Link>
                    <p className="mt-2 text-xs text-ink-muted">
                      {review.author} · {reviewDate(review.created_at)} ·{" "}
                      <span className="text-brand">
                        {"★".repeat(review.rating)}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${review.deleted_at ? "bg-sand text-ink-muted" : "bg-brand-soft text-brand-dark"}`}
                    >
                      {review.deleted_at ? "삭제됨" : "공개 중"}
                    </span>
                    {review.deleted_at ? (
                      <button
                        disabled={busy}
                        className="btn btn-secondary"
                        onClick={() => moderate(review, "restore")}
                      >
                        복원
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary text-danger"
                        disabled={busy}
                        onClick={() => {
                          setSelected(review);
                          setReason("욕설·비방 등 부적절한 내용");
                          dialog.current?.showModal();
                        }}
                      >
                        리뷰 삭제
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-5 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {review.content}
                </p>
                {!review.deleted_at && review.image_count > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Array.from({ length: review.image_count }, (_, index) => (
                      <a
                        key={index}
                        href={reviewImage(review.id, index)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`리뷰 사진 ${index + 1} 원본 보기`}
                      >
                        <Image
                          unoptimized
                          width={96}
                          height={96}
                          className="size-24 rounded-lg border border-line object-cover"
                          alt={`리뷰 사진 ${index + 1}`}
                          src={reviewImage(review.id, index)}
                        />
                      </a>
                    ))}
                  </div>
                )}
                {review.deleted_at && (
                  <p className="mt-4 rounded-lg bg-sand p-3 text-xs text-ink-muted">
                    삭제 사유: {review.deletion_reason} ·{" "}
                    {reviewDate(review.deleted_at)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {data.total > 12 && (
        <nav
          aria-label="관리자 리뷰 페이지"
          className="my-6 flex items-center justify-center gap-4"
        >
          <button
            disabled={page <= 1}
            className="btn btn-secondary disabled:opacity-40"
            onClick={() => {
              setPage(page - 1);
              setLoading(true);
            }}
          >
            이전
          </button>
          <span className="text-sm">
            {page} / {Math.ceil(data.total / 12)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / 12)}
            className="btn btn-secondary disabled:opacity-40"
            onClick={() => {
              setPage(page + 1);
              setLoading(true);
            }}
          >
            다음
          </button>
        </nav>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="moderate-review-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-white p-7 text-ink shadow-xl backdrop:bg-black/40"
      >
        <h2 id="moderate-review-title" className="text-xl font-bold">
          리뷰를 삭제하시겠습니까?
        </h2>
        <p className="mt-3 text-sm text-ink-muted">
          {selected?.product_name} · {selected?.author}
          <br />
          삭제하면 리뷰와 사진이 고객 화면에서 숨겨집니다.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selected) void moderate(selected, "delete");
          }}
        >
          <label
            htmlFor="review-delete-reason"
            className="mt-6 block text-sm font-bold"
          >
            삭제 사유
          </label>
          <textarea
            id="review-delete-reason"
            required
            maxLength={200}
            rows={3}
            className="field mt-2 w-full"
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              className="btn btn-secondary"
              onClick={() => dialog.current?.close()}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy || !reason.trim()}
              className="btn btn-primary disabled:opacity-50"
            >
              {busy ? "처리 중…" : "삭제하기"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
