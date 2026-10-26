"use client";

import { useEffect, useState } from "react";
import type { Review, ReviewPage } from "@/types/review";
import { useAdminStore } from "./AdminStore";
import { AdminProducts } from "./AdminProducts";
import { ConfirmDialog } from "./ConfirmDialog";

const labels = {
  product: "상품",
  recipe: "레시피",
  farm: "농가",
  promotion: "혜택·이벤트",
  review: "리뷰",
};
type Kind = keyof typeof labels;
type Row = {
  key: string;
  kind: Kind;
  name: string;
  deletedAt: string;
  restore: () => Promise<boolean>;
  remove: () => Promise<boolean>;
};
type ReviewRequest = { review: Review; action: "restore" | "purge" };

// 리뷰 관리에서 삭제한 리뷰(삭제됨 상태)를 모두 가져와요. 리뷰는 DB(FastAPI)에 있어서 다른 항목과 따로 불러와요.
async function loadDeletedReviews(signal: AbortSignal) {
  const items: Review[] = [];
  for (let page = 1; ; page++) {
    const response = await fetch(
      `/admin/api/reviews?${new URLSearchParams({ status: "deleted", page: String(page) })}`,
      { cache: "no-store", signal },
    );
    const body = await response.json();
    if (!response.ok)
      throw new Error(
        typeof body.detail === "string"
          ? body.detail
          : "삭제한 리뷰를 불러오지 못했습니다.",
      );
    const result = body as ReviewPage;
    items.push(...result.items);
    if (!result.items.length || items.length >= result.total) return items;
  }
}

export function AdminTrash() {
  const { trash, restore, permanentlyDelete } = useAdminStore();
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewVersion, setReviewVersion] = useState(0);
  const [request, setRequest] = useState<
    (ReviewRequest & { resolve: (done: boolean) => void }) | null
  >(null);

  useEffect(() => {
    const controller = new AbortController();
    loadDeletedReviews(controller.signal)
      .then((items) => {
        setReviews(items);
        setReviewError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setReviewError(
            error instanceof Error
              ? error.message
              : "삭제한 리뷰를 불러오지 못했습니다.",
          );
      });
    return () => controller.abort();
  }, [reviewVersion]);

  // 리뷰 복원·완전 삭제는 확인 창에서 한 번 더 묻고 처리해요.
  const askReview = (review: Review, action: ReviewRequest["action"]) =>
    new Promise<boolean>((resolve) => setRequest({ review, action, resolve }));
  async function runReview(review: Review, action: ReviewRequest["action"]) {
    if (!(await askReview(review, action))) return false;
    const response = await fetch("/admin/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: review.id, action }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setReviewError(
        typeof body.detail === "string" ? body.detail : "처리하지 못했습니다.",
      );
      return false;
    }
    setReviewVersion((value) => value + 1);
    return true;
  }

  const rows: Row[] = [
    ...trash.map((entry) => ({
      key: `${entry.kind}:${entry.item.id}`,
      kind: entry.kind as Kind,
      name: entry.item.name,
      deletedAt: entry.deletedAt,
      restore: () => restore(entry.kind, entry.item.id),
      remove: () => permanentlyDelete(entry.kind, entry.item.id),
    })),
    ...reviews.map((review) => ({
      key: `review:${review.id}`,
      kind: "review" as const,
      name: `${review.product_name} · ${review.author} 님 리뷰`,
      deletedAt: review.deleted_at ?? review.created_at,
      restore: () => runReview(review, "restore"),
      remove: () => runReview(review, "purge"),
    })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
  const filtered = rows.filter(
    (row) => filter === "all" || filter === row.kind,
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  return (
    <AdminProducts
      view="trash"
      description="삭제한 항목을 확인하고 복원할 수 있습니다. 휴지통에서 삭제하면 완전히 삭제되어 되돌릴 수 없습니다."
      topNotice={
        notice && (
          <p
            role="status"
            className="mb-5 rounded-card bg-green-50 p-4 text-sm text-green-800"
          >
            {notice}
          </p>
        )
      }
    >
      <div className="mt-6">
        {reviewError && (
          <p
            role="alert"
            className="mb-4 rounded-card bg-danger-soft p-4 text-sm text-danger"
          >
            {reviewError}
          </p>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" aria-live="polite">
            휴지통 {filtered.length}개
          </p>
          <label className="inline-flex shrink-0 items-center gap-3 text-sm font-bold">
            <span className="sr-only">분류</span>
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
              className="min-h-12 rounded-control border border-line bg-white px-4"
            >
              <option value="all">전체</option>
              {Object.entries(labels).map(([kind, label]) => (
                <option key={kind} value={kind}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto rounded-card border border-line bg-white">
          <table className="w-full min-w-[720px] table-fixed text-center text-sm">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[35%]" />
              <col className="w-[25%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead className="border-b border-line bg-gray-50">
              <tr>
                {["분류", "이름", "삭제 일시", "관리"].map((label) => (
                  <th scope="col" key={label} className="px-5 py-4">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-5 py-4">{labels[row.kind]}</td>
                  <td className="break-words px-5 py-4 font-semibold">
                    {row.name}
                  </td>
                  <td className="px-5 py-4 text-ink-muted">
                    {new Date(row.deletedAt).toLocaleString("ko-KR")}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!(await row.restore())) return;
                          setNotice(`${row.name} 항목이 복원되었습니다.`);
                        }}
                        className="btn btn-secondary text-brand"
                      >
                        복원
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (await row.remove())
                            setNotice(
                              `${row.name} 항목이 완전히 삭제되었습니다.`,
                            );
                        }}
                        className="btn btn-secondary text-danger"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={4} className="p-14 text-center text-ink-muted">
                    휴지통이 비어 있습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <nav
            aria-label="휴지통 페이지"
            className="mt-7 flex flex-wrap justify-center gap-1"
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="이전 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ‹
            </button>
            {Array.from({ length: pages }, (_, index) => index + 1).map(
              (number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => setPage(number)}
                  aria-label={`${number}페이지`}
                  aria-current={currentPage === number ? "page" : undefined}
                  className={`min-h-11 min-w-11 rounded-control ${currentPage === number ? "bg-brand-soft font-bold text-brand" : "hover:bg-white"}`}
                >
                  {number}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="다음 페이지"
              className="min-h-11 min-w-11 rounded-control disabled:opacity-30"
            >
              ›
            </button>
          </nav>
        )}
      </div>
      {request && (
        <ConfirmDialog
          message={
            request.action === "purge"
              ? "리뷰를 완전히 삭제하시겠습니까?"
              : "리뷰를 복원하시겠습니까?"
          }
          name={`${request.review.product_name} · ${request.review.author} 님 리뷰`}
          detail={
            request.action === "purge"
              ? "휴지통에서 삭제하면 리뷰와 사진이 DB에서 완전히 지워지며 복원할 수 없습니다."
              : "리뷰가 다시 고객 화면에 공개됩니다."
          }
          confirmLabel={request.action === "purge" ? "삭제" : "복원"}
          onResult={(confirmed) => {
            request.resolve(confirmed);
            setRequest(null);
          }}
        />
      )}
    </AdminProducts>
  );
}
