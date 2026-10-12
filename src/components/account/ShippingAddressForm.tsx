"use client";

import { useState, useTransition } from "react";
import { saveShippingAddress, clearShippingAddress } from "@/actions/profile";
import { shippingSchema, type ShippingAddress } from "@/schemas/shipping";

const fields = [
  {
    name: "recipient_name",
    label: "받는 분",
    complete: "shipping name",
    max: 40,
    required: true,
  },
  {
    name: "recipient_phone",
    label: "연락처",
    complete: "shipping tel",
    max: 20,
    required: true,
  },
  {
    name: "postal_code",
    label: "우편번호",
    complete: "shipping postal-code",
    max: 5,
    required: true,
  },
  {
    name: "address",
    label: "기본 주소",
    complete: "shipping address-line1",
    max: 200,
    required: true,
  },
  {
    name: "address_detail",
    label: "상세주소",
    complete: "shipping address-line2",
    max: 100,
    required: false,
  },
] as const;

export function ShippingAddressForm({
  userId,
  initialAddress,
}: {
  userId: string;
  initialAddress: ShippingAddress;
}) {
  const [values, setValues] = useState(initialAddress);
  const [saved, setSaved] = useState(initialAddress);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <section
      className="border-t border-line pt-6"
      aria-labelledby="shipping-title"
    >
      <h2 id="shipping-title" className="text-xl font-bold">
        기본 배송지
      </h2>
      <p className="mt-3 text-ink-muted">
        주문할 때 사용할 배송지를 저장해 두세요. 변경해도 이미 접수된 주문의
        배송지는 바뀌지 않아요.
      </p>
      <form
        className="mt-6"
        aria-busy={pending}
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          setMessage("");
          const parsed = shippingSchema.safeParse(values);
          if (!parsed.success) {
            setError(parsed.error.issues[0].message);
            return;
          }
          setError("");
          startTransition(async () => {
            try {
              const result = await saveShippingAddress(parsed.data, userId);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setValues(parsed.data);
              setSaved(parsed.data);
              setMessage("기본 배송지를 저장했어요.");
            } catch {
              setError(
                "저장하지 못했어요. 로그인 상태와 연결을 확인해 주세요.",
              );
            }
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={field.name}
              className={
                field.name === "address" || field.name === "address_detail"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <label className="field-label" htmlFor={`shipping-${field.name}`}>
                {field.label}
                {!field.required && " (선택)"}
              </label>
              <input
                id={`shipping-${field.name}`}
                name={field.name}
                className="field"
                type={field.name === "recipient_phone" ? "tel" : "text"}
                inputMode={
                  field.name === "postal_code"
                    ? "numeric"
                    : field.name === "recipient_phone"
                      ? "tel"
                      : "text"
                }
                autoComplete={field.complete}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={field.max}
                required={field.required}
                disabled={pending}
                value={values[field.name]}
                aria-describedby={error ? "shipping-error" : undefined}
                onChange={(event) => {
                  setValues({ ...values, [field.name]: event.target.value });
                  setError("");
                  setMessage("");
                }}
              />
            </div>
          ))}
        </div>
        {error && (
          <p id="shipping-error" role="alert" className="field-error">
            {error}
          </p>
        )}
        <p role="status" className="mt-4 min-h-7 text-brand">
          {pending ? "처리하고 있어요…" : message}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="btn btn-primary w-full sm:w-auto"
            type="submit"
            disabled={
              pending || JSON.stringify(values) === JSON.stringify(saved)
            }
          >
            {pending ? "처리 중…" : "배송지 저장"}
          </button>
          {saved.address && (
            <button
              className="btn btn-secondary w-full sm:w-auto"
              type="button"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    "저장한 기본 배송지를 삭제할까요? 기존 주문의 배송지는 유지됩니다.",
                  )
                )
                  return;
                setError("");
                setMessage("");
                startTransition(async () => {
                  try {
                    const result = await clearShippingAddress(userId);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    const empty = {
                      recipient_name: "",
                      recipient_phone: "",
                      postal_code: "",
                      address: "",
                      address_detail: "",
                    };
                    setValues(empty);
                    setSaved(empty);
                    setMessage("기본 배송지를 삭제했어요.");
                  } catch {
                    setError("배송지를 삭제하지 못했어요. 다시 시도해 주세요.");
                  }
                });
              }}
            >
              배송지 삭제
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
