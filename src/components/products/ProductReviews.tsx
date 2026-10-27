"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MyReview, ReviewPage } from "@/types/review";

const empty: ReviewPage = { items: [], total: 0, page: 1, size: 12 };
export const reviewImage = (id: string, index: number) =>
  `/api/reviews/images/${id}/${index}`;
export function reviewDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
}

function PhotoPreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <Image
      src={url}
      unoptimized
      width={96}
      height={96}
      alt={`첨부 사진 ${file.name}`}
      className="size-20 rounded-lg object-cover"
    />
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState(empty);
  const [sort, setSort] = useState("newest");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [auth, setAuth] = useState<"checking" | "member" | "guest" | "error">(
    "checking",
  );
  const [mine, setMine] = useState<MyReview | null>(null);
  const [purchased, setPurchased] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoDialog = useRef<HTMLDialogElement>(null);
  const [photo, setPhoto] = useState("");
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      product_id: productId,
      sort,
      kind,
      page: String(page),
    });
    fetch(`/api/reviews?${query}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<ReviewPage>;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setError("");
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("리뷰를 불러오지 못했어요. 다시 시도해 주세요.");
          setLoading(false);
        }
      });
    fetch(
      `/api/reviews/mine?${new URLSearchParams({ product_id: productId })}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        if (response.status === 401) {
          setAuth("guest");
          setMine(null);
          return;
        }
        if (!response.ok) throw new Error();
        const ownReview = await response.json();
        const eligibility = await fetch(
          `/api/reviews/eligibility?${new URLSearchParams({ product_id: productId })}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!eligibility.ok) throw new Error();
        const purchase = await eligibility.json();
        setMine(ownReview);
        setPurchased(purchase.purchased === true);
        setAuth("member");
      })
      .catch(() => {
        if (!controller.signal.aborted) setAuth("error");
      });
    return () => controller.abort();
  }, [productId, sort, kind, page, version]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) {
      setFormError("리뷰 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setFormError("");
    setNotice("");
    const body = new FormData();
    body.set("product_id", productId);
    body.set("rating", String(rating));
    body.set("content", content.trim());
    for (const file of files) body.append("images", file);
    try {
      const response = await fetch("/api/reviews", { method: "POST", body });
      if (!response.ok) {
        const result = await response.json();
        if (response.status === 401) setAuth("guest");
        if (response.status === 409 || response.status === 403) refresh();
        throw new Error(
          typeof result.detail === "string"
            ? result.detail
            : "리뷰 내용을 확인해 주세요.",
        );
      }
      setContent("");
      setFiles([]);
      if (fileInput.current) fileInput.current.value = "";
      setPage(1);
      setSort("newest");
      setKind("all");
      refresh();
      setNotice("리뷰가 등록되었습니다. 소중한 후기를 남겨주셔서 감사해요.");
      window.dispatchEvent(new Event("motnani-review-changed"));
    } catch (e) {
      setFormError(
        e instanceof Error
          ? e.message
          : "등록하지 못했어요. 다시 시도해 주세요.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="reviews"
      aria-labelledby="product-review-title"
      className="mt-16 scroll-mt-24 border-t border-line pt-10"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-widest text-brand">
            CUSTOMER REVIEWS
          </p>
          <h2 id="product-review-title" className="mt-2 text-2xl font-bold">
            상품 후기 <span className="text-brand">{data.total}</span>
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            이 상품을 만난 회원님들의 솔직한 이야기예요.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={refresh}>
          새로고침
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <h3 className="font-bold">나의 후기 남기기</h3>
        {auth === "checking" ? (
          <p role="status" className="mt-3 text-sm text-ink-muted">
            로그인 상태를 확인하고 있어요.
          </p>
        ) : auth === "guest" ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              로그인한 회원만 후기를 남길 수 있어요.
            </p>
            <Link
              className="btn btn-primary"
              href={`/login?next=${encodeURIComponent(`/products/${productId}#reviews`)}`}
            >
              로그인하고 작성하기
            </Link>
          </div>
        ) : auth === "error" ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            로그인 정보를 확인하지 못했어요.{" "}
            <button onClick={refresh} className="underline">
              다시 확인
            </button>
          </p>
        ) : mine ? (
          <div className="mt-4 rounded-xl bg-sand p-5">
            <p className="text-sm font-bold text-brand-dark">
              {mine.deleted_at ? "관리자가 삭제한 후기입니다." : "작성한 후기"}
            </p>
            <p
              className="mt-2 text-sm text-brand"
              aria-label={`별점 ${mine.rating}점`}
            >
              {"★".repeat(mine.rating)}
              {"☆".repeat(5 - mine.rating)}
            </p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {mine.content}
            </p>
            {mine.deleted_at && (
              <p className="mt-3 text-sm text-ink-muted">
                삭제 사유: {mine.deletion_reason}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              상품당 한 번 후기를 남길 수 있어요.
            </p>
          </div>
        ) : !purchased ? (
          <p className="mt-3 text-sm text-ink-muted">
            결제 완료한 주문에 포함된 상품만 후기를 작성할 수 있어요.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">
              별점
              <select
                value={rating}
                disabled={saving}
                onChange={(e) => setRating(Number(e.target.value))}
                className="field ml-3 text-brand"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} · {n}점
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              리뷰 내용 <span className="text-brand">*</span>
              <textarea
                required
                minLength={1}
                maxLength={1000}
                disabled={saving}
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="맛과 신선도, 배송 경험을 들려주세요."
                className="field mt-2 w-full resize-y font-normal"
              />
            </label>
            <p className="text-right text-xs text-ink-muted">
              {content.length}/1,000자
            </p>
            <div>
              <label
                className="block text-sm font-semibold"
                htmlFor="review-images"
              >
                사진 첨부{" "}
                <span className="font-normal text-ink-muted">
                  (선택 · 최대 3장)
                </span>
              </label>
              <input
                ref={fileInput}
                id="review-images"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                disabled={saving}
                className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-sand file:px-4 file:py-2 file:text-ink"
                onChange={(e) => {
                  const selected = Array.from(e.target.files ?? []);
                  if (selected.length + files.length > 3) {
                    setFormError("사진은 최대 3장까지 첨부할 수 있어요.");
                    e.target.value = "";
                    return;
                  }
                  if (
                    selected.some(
                      (file) =>
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          file.type,
                        ) || file.size > 5 * 1024 * 1024,
                    )
                  ) {
                    setFormError(
                      "JPG·PNG·WEBP 사진을 한 장당 5MB 이하로 첨부해 주세요.",
                    );
                    e.target.value = "";
                    return;
                  }
                  setFiles((previous) => [...previous, ...selected]);
                  setFormError("");
                  e.target.value = "";
                }}
              />
              <p className="mt-2 text-xs text-ink-muted">
                글만 작성해도 괜찮아요. 사진은 JPG·PNG·WEBP, 한 장당 5MB까지
                가능해요.
              </p>
            </div>
            {files.length > 0 && (
              <ul className="flex flex-wrap gap-3">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="relative">
                    <PhotoPreview file={file} />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setFiles(files.filter((_, i) => i !== index))
                      }
                      aria-label={`${index + 1}번째 첨부 사진 삭제`}
                      className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-line bg-white"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end border-t border-line pt-4">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary disabled:opacity-50"
              >
                {saving ? "등록 중…" : "리뷰 등록"}
              </button>
            </div>
          </form>
        )}
        {formError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {formError}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mt-3 rounded-lg bg-brand-soft p-3 text-sm text-brand-dark"
          >
            {notice}
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div className="flex flex-wrap gap-2" aria-label="리뷰 유형">
          {[
            ["all", "전체 리뷰"],
            ["images", "이미지 리뷰만 보기"],
            ["text", "글 리뷰만 보기"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value);
                setPage(1);
                setLoading(true);
              }}
              className={`min-h-10 rounded-full border px-4 text-sm ${kind === value ? "border-brand bg-brand-soft font-bold text-brand-dark" : "border-line text-ink-muted hover:border-brand"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="text-sm text-ink-muted">
          정렬{" "}
          <select
            value={sort}
            className="ml-2 rounded-lg border border-line bg-white p-2 text-ink"
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
              setLoading(true);
            }}
          >
            <option value="newest">최신순</option>
            <option value="oldest">과거순</option>
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert" className="py-12 text-center text-sm text-danger">
          {error}{" "}
          <button type="button" onClick={refresh} className="underline">
            다시 시도
          </button>
        </p>
      ) : loading ? (
        <p role="status" className="py-12 text-center text-sm text-ink-muted">
          리뷰를 불러오고 있어요.
        </p>
      ) : data.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-muted">
          {kind === "all"
            ? "아직 작성된 리뷰가 없습니다. 첫 후기를 남겨주세요."
            : "해당하는 리뷰가 없습니다."}
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {data.items.map((review) => (
            <li key={review.id} className="py-7 sm:flex sm:gap-8">
              <div className="mb-3 shrink-0 sm:w-36">
                <p className="font-semibold">{review.author}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  {reviewDate(review.created_at)}
                </p>
                <p
                  className="mt-2 text-sm text-brand"
                  aria-label={`별점 ${review.rating}점`}
                >
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap break-words leading-relaxed">
                  {review.content}
                </p>
                {review.image_count > 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {Array.from({ length: review.image_count }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`${review.author}님의 리뷰 사진 ${i + 1} 크게 보기`}
                        onClick={() => {
                          setPhoto(reviewImage(review.id, i));
                          photoDialog.current?.showModal();
                        }}
                      >
                        <Image
                          unoptimized
                          src={reviewImage(review.id, i)}
                          width={112}
                          height={112}
                          alt={`리뷰 사진 ${i + 1}`}
                          className="size-24 rounded-xl border border-line object-cover sm:size-28"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data.total > 12 && (
        <nav
          aria-label="리뷰 페이지"
          className="mt-6 flex items-center justify-center gap-5"
        >
          <button
            disabled={page === 1}
            onClick={() => {
              setPage(page - 1);
              setLoading(true);
            }}
            className="btn btn-secondary disabled:opacity-40"
          >
            이전
          </button>
          <span className="text-sm">
            {page} / {Math.ceil(data.total / 12)}
          </span>
          <button
            disabled={page >= Math.ceil(data.total / 12)}
            onClick={() => {
              setPage(page + 1);
              setLoading(true);
            }}
            className="btn btn-secondary disabled:opacity-40"
          >
            다음
          </button>
        </nav>
      )}
      <dialog
        ref={photoDialog}
        aria-label="리뷰 사진 크게 보기"
        className="fixed inset-0 m-auto max-h-[90dvh] w-[min(90vw,800px)] rounded-2xl bg-white p-4 backdrop:bg-black/60"
        onClick={(e) => {
          if (e.target === e.currentTarget) photoDialog.current?.close();
        }}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => photoDialog.current?.close()}
          >
            닫기
          </button>
        </div>
        {photo && (
          <Image
            unoptimized
            src={photo}
            width={1200}
            height={1200}
            alt="확대한 리뷰 사진"
            className="max-h-[72dvh] w-full object-contain"
          />
        )}
      </dialog>
    </section>
  );
}
