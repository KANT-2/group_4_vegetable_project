"use client";

import { useRef, useState } from "react";
import Script from "next/script";

type AddressResult = {
  zonecode: string;
  address: string;
  roadAddress: string;
  jibunAddress: string;
  userSelectedType: string;
};
type PostcodeApi = {
  Postcode: new (options: {
    oncomplete: (data: AddressResult) => void;
    width: string;
    height: string;
  }) => { embed: (element: HTMLElement) => void };
};

export function AddressSearchButton({
  onSelect,
}: {
  onSelect: (postalCode: string, address: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Script
        src="https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() =>
          setError(
            "주소 검색을 불러오지 못했어요. 우편번호와 주소를 직접 입력해 주세요.",
          )
        }
      />
      <button
        type="button"
        className="btn shrink-0 border border-brand text-brand"
        disabled={!ready}
        onClick={() => {
          const browser = window as typeof window & {
            kakao?: PostcodeApi;
            daum?: PostcodeApi;
          };
          const api = browser.kakao?.Postcode ? browser.kakao : browser.daum;
          if (!api || !container.current) {
            setError("주소 검색에 연결하지 못했어요. 다시 시도해 주세요.");
            return;
          }
          dialog.current?.showModal();
          container.current.replaceChildren();
          new api.Postcode({
            width: "100%",
            height: "100%",
            oncomplete: (data) => {
              const address =
                data.userSelectedType === "R"
                  ? data.roadAddress
                  : data.jibunAddress;
              dialog.current?.close();
              onSelect(data.zonecode, address || data.address);
            },
          }).embed(container.current);
        }}
      >
        {ready ? "주소 검색" : "주소 검색 준비 중"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="customer-address-search-title"
        className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-white p-4 shadow-xl backdrop:bg-black/30"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id="customer-address-search-title" className="font-bold">
            배송지 주소 검색
          </h3>
          <button
            type="button"
            aria-label="주소 검색 닫기"
            onClick={() => dialog.current?.close()}
            className="size-10 text-2xl"
          >
            ×
          </button>
        </div>
        <div ref={container} className="h-[min(480px,65dvh)] w-full" />
      </dialog>
    </>
  );
}
