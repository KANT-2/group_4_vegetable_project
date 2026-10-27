"use client";

import { useActionState, useState } from "react";
import { changeAdminPassword } from "@/actions/admin-password";
import { adminPasswordError } from "@/lib/admin-password-validation";

export function AdminPasswordForm({ googleOnly, fastApi }: { googleOnly: boolean; fastApi?: boolean }) {
  const [state, action, pending] = useActionState(changeAdminPassword, {
    error: "",
    success: "",
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const mismatch = confirmation.length > 0 && confirmation !== password;
  const unavailable = googleOnly || fastApi;
  return (
    <section className="min-w-0 self-start rounded-card border border-line bg-white p-6 sm:p-8">
      <h2 className="text-xl font-bold">비밀번호 변경</h2>
      {unavailable ? (
        <p className="mt-4 text-sm text-ink-muted">
          {fastApi
            ? "이 계정의 비밀번호 변경 기능은 준비 중입니다."
            : "Google 연동 계정의 비밀번호는 Google 계정 설정에서 변경해 주세요."}
        </p>
      ) : (
        <form
          action={action}
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            const data = new FormData(event.currentTarget);
            const invalid = adminPasswordError(
              String(data.get("currentPassword") ?? ""),
              String(data.get("newPassword") ?? ""),
              String(data.get("confirmPassword") ?? ""),
            );
            setError(invalid);
            if (invalid) event.preventDefault();
            else {
              setPassword("");
              setConfirmation("");
            }
          }}
        >
          {[
            ["currentPassword", "현재 비밀번호", "current-password"],
            ["newPassword", "새 비밀번호", "new-password"],
            ["confirmPassword", "새 비밀번호 재확인", "new-password"],
          ].map(([name, label, autocomplete]) => (
            <label key={name} className="block text-sm font-bold">
              {label}
              <input
                name={name}
                type="password"
                required
                maxLength={name === "currentPassword" ? 200 : 128}
                autoComplete={autocomplete}
                aria-invalid={
                  name === "confirmPassword" && mismatch ? true : undefined
                }
                aria-describedby={
                  name === "confirmPassword" && mismatch
                    ? "admin-password-mismatch"
                    : undefined
                }
                onChange={(event) => {
                  if (name === "newPassword") setPassword(event.target.value);
                  if (name === "confirmPassword")
                    setConfirmation(event.target.value);
                }}
                className="mt-2 min-h-12 w-full rounded-control border border-line bg-white px-4 text-base font-normal"
              />
              {name === "newPassword" && (
                <p className="mt-2 text-xs font-normal text-ink-muted">
                  12~128자 · 영문 대·소문자, 숫자, 기호 사용 가능
                </p>
              )}
              {name === "confirmPassword" && mismatch && (
                <p
                  id="admin-password-mismatch"
                  role="alert"
                  className="mt-2 font-normal text-danger"
                >
                  새 비밀번호가 일치하지 않습니다.
                </p>
              )}
            </label>
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
          <div className="flex justify-end border-t border-line pt-5">
            <button disabled={pending} className="btn btn-primary">
              {pending ? "변경 중…" : "비밀번호 변경"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
