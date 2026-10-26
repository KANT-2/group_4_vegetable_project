"use client";

import { useActionState, useState } from "react";
import { changeCustomerPassword } from "@/actions/customer-password";
import { adminPasswordError } from "@/lib/admin-password-validation";

export function PasswordChangeForm({ googleOnly }: { googleOnly: boolean }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [state, action, pending] = useActionState(
    async (previous: { error: string; success: string }, form: FormData) => {
      const result = await changeCustomerPassword(previous, form);
      if (result.success) {
        setCurrent("");
        setPassword("");
        setConfirmation("");
        setVisible({});
      }
      return result;
    },
    { error: "", success: "" },
  );
  const [error, setError] = useState("");
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const unavailable = googleOnly;
  return (
    <section className="min-w-0 rounded-xl border border-line bg-white p-6 sm:p-8">
      <div className="border-b border-line pb-4">
        <h2 className="text-xl font-bold">비밀번호 변경</h2>
      </div>
      {unavailable ? (
        <p className="mt-4 text-sm text-ink-muted">
          Google 연동 계정의 비밀번호는 Google 계정 설정에서 변경해 주세요.
        </p>
      ) : (
        <form
          action={action}
          className="mx-auto mt-6 max-w-2xl space-y-6"
          onSubmit={(event) => {
            const data = new FormData(event.currentTarget);
            const invalid = adminPasswordError(
              String(data.get("currentPassword") ?? ""),
              String(data.get("newPassword") ?? ""),
              String(data.get("confirmPassword") ?? ""),
            );
            setError(invalid);
            if (invalid) event.preventDefault();
          }}
        >
          {[
            ["currentPassword", "현재 비밀번호", "current-password"],
            ["newPassword", "새 비밀번호", "new-password"],
            ["confirmPassword", "새 비밀번호 재확인", "new-password"],
          ].map(([name, label, autocomplete]) => (
            <div
              key={name}
              className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-5"
            >
              <label
                htmlFor={`customer-${name}`}
                className="text-sm font-bold sm:pt-3.5"
              >
                {label} <span className="text-brand">*</span>
              </label>
              <div>
                <div className="relative">
                  <input
                    id={`customer-${name}`}
                    name={name}
                    type={visible[name] ? "text" : "password"}
                    value={
                      name === "currentPassword"
                        ? current
                        : name === "newPassword"
                          ? password
                          : confirmation
                    }
                    disabled={pending}
                    placeholder={
                      name === "currentPassword"
                        ? "현재 비밀번호 입력"
                        : name === "newPassword"
                          ? "새 비밀번호 입력"
                          : "새 비밀번호를 다시 입력해 주세요"
                    }
                    required
                    maxLength={name === "currentPassword" ? 200 : 128}
                    autoComplete={autocomplete}
                    aria-invalid={
                      name === "confirmPassword" && mismatch ? true : undefined
                    }
                    aria-describedby={
                      name === "confirmPassword" && mismatch
                        ? "customer-password-mismatch"
                        : name === "newPassword"
                          ? "customer-password-help"
                          : undefined
                    }
                    onChange={(event) => {
                      if (name === "currentPassword")
                        setCurrent(event.target.value);
                      if (name === "newPassword")
                        setPassword(event.target.value);
                      if (name === "confirmPassword")
                        setConfirmation(event.target.value);
                    }}
                    className={`min-h-12 w-full rounded-control border bg-white pl-4 pr-12 text-base font-normal ${name === "confirmPassword" && mismatch ? "border-danger" : "border-line"}`}
                  />
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`${label} ${visible[name] ? "숨기기" : "보기"}`}
                    aria-pressed={Boolean(visible[name])}
                    onClick={() =>
                      setVisible((previous) => ({
                        ...previous,
                        [name]: !previous[name],
                      }))
                    }
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-muted hover:text-brand"
                  >
                    <svg
                      aria-hidden="true"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    >
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                      {visible[name] && <path d="m3 3 18 18" />}
                    </svg>
                  </button>
                </div>
                {name === "newPassword" && (
                  <p
                    id="customer-password-help"
                    className="mt-2 text-xs font-normal text-ink-muted"
                  >
                    12~128자 · 영문 대·소문자, 숫자, 기호 사용 가능
                  </p>
                )}
                {name === "confirmPassword" && mismatch && (
                  <p
                    id="customer-password-mismatch"
                    role="alert"
                    className="mt-2 font-normal text-danger"
                  >
                    새 비밀번호가 일치하지 않습니다.
                  </p>
                )}
                {name === "confirmPassword" && confirmation && !mismatch && (
                  <p role="status" className="mt-2 text-xs text-green-700">
                    새 비밀번호가 일치합니다.
                  </p>
                )}
              </div>
            </div>
          ))}
          {(error || state.error) && (
            <p role="alert" className="text-sm text-danger">
              {error || state.error}
            </p>
          )}
          {state.success && (
            <p
              role="status"
              className="rounded-control bg-green-50 p-3 text-sm text-green-800"
            >
              {state.success}
            </p>
          )}
          <div className="flex justify-center border-t border-line pt-6">
            <button
              disabled={pending}
              className="btn btn-primary w-full sm:w-56"
            >
              {pending ? "변경 중…" : "비밀번호 변경"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
