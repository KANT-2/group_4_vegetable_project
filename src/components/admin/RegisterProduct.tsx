"use client";

import { useRef, useState } from "react";
import { ProductForm } from "./ProductForm";
import { useUnsavedDialog } from "./useUnsavedDialog";
import type { RegisteredProduct } from "./ProductForm";

export function RegisterProduct({
  existingIds,
  onRegister,
}: {
  existingIds: string[];
  onRegister: (product: RegisteredProduct) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [opened, setOpened] = useState(false);
  const discard = useUnsavedDialog(dialog, opened);
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="btn btn-primary shrink-0"
        onClick={() => {
          setOpened(true);
          dialog.current?.showModal();
        }}
      >
        + 상품 등록하기
      </button>
      <dialog
        ref={dialog}
        onCancel={discard.onCancel}
        aria-labelledby="register-title"
        onClose={() => {
          setOpened(false);
          trigger.current?.focus();
        }}
        className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-card border border-line bg-white p-6 shadow-xl backdrop:bg-black/30 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="register-title" className="text-2xl font-bold">
            상품 등록하기
          </h2>
          <button
            type="button"
            aria-label="상품 등록 닫기"
            onClick={discard.requestClose}
            className="min-h-11 min-w-11 text-3xl text-ink-muted"
          >
            ×
          </button>
        </div>
        {opened && (
          <ProductForm
            existingIds={existingIds}
            onSubmit={(product) => {
              onRegister(product);
              dialog.current?.close();
            }}
            onCancel={discard.requestClose}
            submitLabel="상품 등록"
          />
        )}
      </dialog>
    </>
  );
}
