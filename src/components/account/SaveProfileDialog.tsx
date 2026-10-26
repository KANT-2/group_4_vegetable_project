"use client";

import { useEffect, useRef } from "react";

export function SaveProfileDialog({
  onResult,
}: {
  onResult: (confirmed: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-labelledby="customer-save-title"
      aria-describedby="customer-save-detail"
      onCancel={(event) => {
        event.preventDefault();
        onResult(false);
      }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line bg-white p-7 text-center shadow-xl backdrop:bg-black/30 sm:p-8"
    >
      <div
        aria-hidden="true"
        className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      </div>
      <h2 id="customer-save-title" className="text-xl font-bold">
        내용을 저장하시겠습니까?
      </h2>
      <p
        id="customer-save-detail"
        className="mt-3 text-sm leading-relaxed text-ink-muted"
      >
        입력하신 회원 정보와 기본 배송지를
        <br />
        저장합니다.
      </p>
      <div className="mt-7 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="btn border border-line bg-white"
          onClick={() => onResult(false)}
        >
          취소
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onResult(true)}
        >
          저장
        </button>
      </div>
    </dialog>
  );
}
