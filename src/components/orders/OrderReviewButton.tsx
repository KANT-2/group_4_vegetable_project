"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

const reviewEvent = "motnani-review-changed";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(reviewEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(reviewEvent, callback);
  };
}
function readReview(key: string): { rating: number; content: string } | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    return saved && typeof saved.content === "string" && saved.content.trim() && Number.isInteger(saved.rating) && saved.rating >= 1 && saved.rating <= 5 ? saved : null;
  } catch { return null; }
}

export function OrderReviewButton({ userId, orderId, items }: {
  userId: string;
  orderId: string;
  items: { product_id: string; product_name: string }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState(items[0]?.product_id ?? "");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [viewing, setViewing] = useState(false);
  const storageKey = `motnani-review:${userId}:${orderId}:${product}`;
  const completed = useSyncExternalStore(subscribe, () => items.filter((item) => readReview(`motnani-review:${userId}:${orderId}:${item.product_id}`)).length, () => 0);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  function loadReview(productId: string) {
    setProduct(productId);
    setMessage("");
    setError("");
    setRating(5);
    setContent("");
    setViewing(false);
    try {
      const saved = JSON.parse(localStorage.getItem(`motnani-review:${userId}:${orderId}:${productId}`) ?? "null");
      if (saved && typeof saved.content === "string" && Number.isInteger(saved.rating) && saved.rating >= 1 && saved.rating <= 5) {
        setContent(saved.content);
        setRating(saved.rating);
        setViewing(true);
      }
    } catch { setError("저장된 리뷰를 불러오지 못했어요."); }
  }

  return <>
    <div className="ml-auto flex shrink-0 items-center justify-end gap-3 xl:ml-0">
      <span className={`min-w-14 whitespace-nowrap text-right text-xs ${completed === items.length && completed > 0 ? "text-green-700" : "text-ink-muted"}`}>{completed === items.length && completed > 0 ? "작성 완료" : completed > 0 ? `${completed}/${items.length}개 작성` : "미작성"}</span>
      <button type="button" aria-haspopup="dialog" onClick={() => {
        const selected = completed > 0 ? items.find((item) => readReview(`motnani-review:${userId}:${orderId}:${item.product_id}`)) : items[0];
        loadReview(selected?.product_id ?? ""); setOpen(true);
      }} className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-control border border-brand/30 bg-brand-soft px-3 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand/10">{completed > 0 ? "리뷰 보기" : "리뷰 작성"}</button>
    </div>
    {open && <dialog ref={dialog} aria-labelledby={title} onClose={() => setOpen(false)} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-6 text-ink shadow-xl backdrop:bg-black/40 sm:p-8">
      <div className="flex items-center justify-between"><h2 id={title} className="text-xl font-bold">{viewing ? "리뷰 보기" : "리뷰 작성"}</h2><button type="button" aria-label="리뷰 닫기" onClick={() => dialog.current?.close()} className="flex size-10 items-center justify-center text-2xl text-ink-muted">×</button></div>
      <p className="mt-2 break-all text-xs text-ink-muted">주문번호 {orderId}</p>
      <form className="mt-6 space-y-5" onSubmit={(event) => {
        event.preventDefault();
        if (!content.trim()) { setError("리뷰 내용을 입력해 주세요."); return; }
        try {
          localStorage.setItem(storageKey, JSON.stringify({ rating, content: content.trim(), updatedAt: new Date().toISOString() }));
          setError("");
          setViewing(true);
          window.dispatchEvent(new Event(reviewEvent));
          setMessage("리뷰가 저장되었어요.");
        } catch { setError("리뷰를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요."); }
      }}>
        <label className="block text-sm font-bold">주문 상품<select className="field mt-2 w-full" value={product} onChange={(event) => loadReview(event.target.value)}>{items.map((item) => <option key={item.product_id} value={item.product_id}>{item.product_name}</option>)}</select></label>
        <label className="block text-sm font-bold">별점<select className="field mt-2 w-full text-brand" disabled={viewing} value={rating} onChange={(event) => { setRating(Number(event.target.value)); setMessage(""); }}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{"★".repeat(value)} · {value}점</option>)}</select></label>
        <label className="block text-sm font-bold">리뷰 내용<textarea readOnly={viewing} required maxLength={1000} rows={5} value={content} onChange={(event) => { setContent(event.target.value); setMessage(""); }} placeholder="상품의 맛과 신선도, 배송 경험을 들려주세요." className="field mt-2 w-full resize-y font-normal" /></label>
        <p className="text-right text-xs text-ink-muted">{content.length}/1,000자</p>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {message && <p role="status" className="rounded-control bg-green-50 p-3 text-sm text-green-800">{message}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-5"><button type="button" className="btn btn-secondary" onClick={() => dialog.current?.close()}>닫기</button>{viewing ? <button type="button" className="btn btn-primary" onClick={() => { setViewing(false); setMessage(""); }}>리뷰 수정</button> : <button className="btn btn-primary" type="submit">리뷰 저장</button>}</div>
      </form>
    </dialog>}
  </>;
}
