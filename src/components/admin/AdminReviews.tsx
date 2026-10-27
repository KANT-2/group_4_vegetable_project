"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Review, ReviewPage } from "@/types/review";
import { reviewDate, reviewImage } from "@/components/products/ProductReviews";
import { AdminProducts } from "./AdminProducts";

// 브라우저(한국) 날짜를 YYYY-MM-DD 로. days 만큼 앞의 날짜도 만들 수 있어요.
function localDate(daysAgo = 0) {
  const day = new Date();
  day.setDate(day.getDate() - daysAgo);
  return day.toLocaleDateString("sv-SE");
}
const PERIODS = [
  { label: "오늘", days: 0 },
  { label: "최근 7일", days: 6 },
  { label: "최근 30일", days: 29 },
];

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
  const [kind, setKind] = useState("all"); // 전체 · 사진 리뷰 · 글 리뷰
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
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
      `/admin/api/reviews?${new URLSearchParams({
        q: query,
        status,
        page: String(page),
        kind,
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      })}`,
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
  }, [query, status, page, version, kind, dateFrom, dateTo]);
  // 조건을 바꾸면 1쪽부터 다시 불러와요.
  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
    setLoading(true);
  };

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
          ? "리뷰를 휴지통으로 옮겼습니다."
          : "리뷰를 복원했습니다.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  // 처리 결과 알림은 휴지통 화면처럼 "리뷰 관리" 제목 위에 보여요.
  return (
    <AdminProducts
      view="reviews"
      topNotice={
        notice && (
          <p
            role="status"
            className="mb-5 rounded-card border border-brand/20 bg-brand-soft p-4 text-sm text-brand-dark"
          >
            {notice}
          </p>
        )
      }
    >
      <p className="mt-3 text-sm text-ink-muted">
        상품과 관계없는 내용이나 부적절한 후기를 검토하고 관리하세요.
      </p>
      <form
        className="my-6 flex flex-wrap gap-3 md:flex-nowrap"
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
        {/* 넓은 화면: 검색창 · 리뷰 종류 · 공개 상태 · [검색] · [새로고침] 한 줄 / 휴대폰: 여러 줄 */}
        <input
          id="admin-review-search"
          className="field min-w-0 flex-1 basis-72"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={100}
          placeholder="상품명 또는 리뷰 내용 검색"
        />
        <label className="sr-only" htmlFor="admin-review-kind">
          리뷰 종류
        </label>
        <select
          id="admin-review-kind"
          value={kind}
          onChange={(e) => changeFilter(() => setKind(e.target.value))}
          className="field shrink-0 sm:w-44"
        >
          <option value="all">전체</option>
          <option value="images">이미지 리뷰</option>
          <option value="text">글 리뷰</option>
        </select>
        <label className="sr-only" htmlFor="admin-review-status">
          리뷰 공개 상태
        </label>
        <select
          id="admin-review-status"
          value={status}
          onChange={(e) => changeFilter(() => setStatus(e.target.value))}
          className="field shrink-0 sm:w-44"
        >
          <option value="visible">공개 중</option>
          <option value="all">전체</option>
        </select>
        <button type="submit" className="btn btn-primary shrink-0">
          검색
        </button>
        <button
          type="button"
          className="btn btn-secondary shrink-0"
          onClick={refresh}
        >
          새로고침
        </button>
      </form>
      {/* 작성 기간: 직접 고르거나 빠른 버튼으로. 비우면 전체 기간이에요. */}
      <fieldset className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <legend className="sr-only">작성 기간</legend>
        <span className="mr-1 text-sm font-bold text-ink">기간</span>
        <label className="sr-only" htmlFor="admin-review-from">
          시작일
        </label>
        <input
          id="admin-review-from"
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => changeFilter(() => setDateFrom(e.target.value))}
          className="field min-h-10 w-auto py-1.5 text-sm"
        />
        <span aria-hidden className="text-ink-muted">
          ~
        </span>
        <label className="sr-only" htmlFor="admin-review-to">
          종료일
        </label>
        <input
          id="admin-review-to"
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => changeFilter(() => setDateTo(e.target.value))}
          className="field min-h-10 w-auto py-1.5 text-sm"
        />
        {PERIODS.map((period) => {
          const active =
            dateFrom === localDate(period.days) && dateTo === localDate();
          return (
            <button
              key={period.label}
              type="button"
              aria-pressed={active}
              onClick={() =>
                changeFilter(() => {
                  setDateFrom(localDate(period.days));
                  setDateTo(localDate());
                })
              }
              className={`min-h-10 rounded-full border px-3.5 text-sm font-semibold ${active ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-muted hover:text-ink"}`}
            >
              {period.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={!dateFrom && !dateTo}
          onClick={() =>
            changeFilter(() => {
              setDateFrom("");
              setDateTo("");
            })
          }
          className={`min-h-10 rounded-full border px-3.5 text-sm font-semibold ${!dateFrom && !dateTo ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-white text-ink-muted hover:text-ink"}`}
        >
          전체 기간
        </button>
      </fieldset>
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
                      {review.deleted_at ? "휴지통" : "공개 중"}
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
                    {reviewDate(review.deleted_at)} · 완전 삭제는{" "}
                    <Link href="/admin/trash" className="underline">
                      휴지통
                    </Link>
                    에서 할 수 있어요.
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
              {busy ? "처리 중…" : "삭제"}
            </button>
          </div>
        </form>
      </dialog>
    </AdminProducts>
  );
}
