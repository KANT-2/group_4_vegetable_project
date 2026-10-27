"use client";

import { useEffect, useRef, type RefObject, type SyntheticEvent } from "react";

function snapshot(dialog: HTMLDialogElement | null) {
  if (!dialog) return "";
  return JSON.stringify(
    Array.from(
      dialog.querySelectorAll(
        "form input, form textarea, form select, form img",
      ),
    ).map((element) => {
      if (element instanceof HTMLImageElement)
        return ["image", element.getAttribute("src")];
      const input = element as
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input instanceof HTMLInputElement && input.type === "file")
        return ["file"];
      return [
        input.name,
        input.type,
        input.value,
        input instanceof HTMLInputElement ? input.checked : undefined,
      ];
    }),
  );
}

export function useUnsavedDialog(
  dialog: RefObject<HTMLDialogElement | null>,
  resetKey: unknown = true,
) {
  const original = useRef("");
  useEffect(() => {
    original.current = snapshot(dialog.current);
  }, [dialog, resetKey]);

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (
        dialog.current?.open &&
        snapshot(dialog.current) !== original.current
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dialog]);

  function requestClose() {
    if (
      snapshot(dialog.current) === original.current ||
      window.confirm("작성 중인 내용을 취소하시겠습니까?")
    ) {
      dialog.current?.close();
    }
  }
  function onCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    requestClose();
  }
  return { requestClose, onCancel };
}
