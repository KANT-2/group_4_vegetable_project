"use client";

import { useEffect, useId, useRef } from "react";

// 구매 수량이 남은 재고를 넘을 때 띄우는 안내 팝업. message 가 있으면 열리고, 확인·Esc 로 닫혀요.
export function StockAlertDialog({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (message && !element.open) element.showModal();
    if (!message && element.open) element.close();
  }, [message]);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-labelledby={titleId}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-card border border-line bg-white p-6 shadow-xl backdrop:bg-black/30"
    >
      <h2 id={titleId} className="text-lg font-bold text-ink">
        구매 가능 수량 안내
      </h2>
      <p className="mt-3 text-ink">{message}</p>
      <form method="dialog" className="mt-6 flex justify-end">
        <button autoFocus className="btn btn-primary min-w-24">
          확인
        </button>
      </form>
    </dialog>
  );
}
