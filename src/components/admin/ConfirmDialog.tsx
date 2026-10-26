"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  message,
  name,
  detail,
  confirmLabel,
  onResult,
}: {
  message: string;
  name?: string;
  detail: string;
  confirmLabel: string;
  onResult: (confirmed: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-labelledby="admin-confirm-title"
      aria-describedby="admin-confirm-detail"
      onCancel={(event) => {
        event.preventDefault();
        onResult(false);
      }}
      onClose={() => onResult(false)}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-card border border-line bg-white p-6 shadow-xl backdrop:bg-black/30"
    >
      <h2 id="admin-confirm-title" className="text-xl font-bold">
        {message}
      </h2>
      {name && (
        <p className="mt-3 break-words font-semibold text-brand">{name}</p>
      )}
      <p id="admin-confirm-detail" className="mt-3 text-sm text-ink-muted">
        {detail}
      </p>
      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onResult(false)}
          className="btn btn-secondary"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onResult(true)}
          className="btn btn-primary"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
