"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function OrderDetailsPopup({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className="grid min-w-0 w-full flex-[1_1_100%] cursor-pointer xl:flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-brand xl:grid-cols-[10rem_minmax(0,1fr)_auto_auto_6.5rem]">
        {summary}
      </button>
      {open && (
        <dialog ref={dialog} aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close();
          }
        }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white p-0 text-ink shadow-xl backdrop:bg-black/40">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-5 py-4 sm:px-7">
            <h2 id={titleId} className="text-xl font-bold">주문 상세</h2>
            <button type="button" autoFocus aria-label="주문 상세 닫기" onClick={() => dialog.current?.close()} className="flex size-10 items-center justify-center rounded-full text-2xl text-ink-muted hover:bg-sand">×</button>
          </div>
          {children}
          <div className="flex justify-center border-t border-line px-5 py-5"><button type="button" className="btn btn-primary w-full sm:w-40" onClick={() => dialog.current?.close()}>닫기</button></div>
        </dialog>
      )}
    </>
  );
}
