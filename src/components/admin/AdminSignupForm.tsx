"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { adminSignUp, completeGoogleAdminSignup } from "@/actions/admin-signup";
import { adminSignupError } from "@/lib/admin-signup-validation";

export function AdminSignupForm({
  googleUser,
}: {
  googleUser?: { email: string; name: string };
}) {
  const [state, action, pending] = useActionState(
    googleUser ? completeGoogleAdminSignup : adminSignUp,
    { error: "", success: "" },
  );
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const passwordMismatch =
    !googleUser && confirmation.length > 0 && password !== confirmation;
  const fields = [
    {
      name: "id",
      label: "아이디",
      type: "text",
      autoComplete: "username",
      max: 40,
    },
    ...(!googleUser
      ? [
          {
            name: "password",
            label: "비밀번호",
            type: "password",
            autoComplete: "new-password",
            max: 128,
          },
          {
            name: "confirmPassword",
            label: "비밀번호 재확인",
            type: "password",
            autoComplete: "new-password",
            max: 128,
          },
        ]
      : []),
    {
      name: "name",
      label: "이름",
      type: "text",
      autoComplete: "name",
      max: 60,
    },
    {
      name: "email",
      label: "이메일",
      type: "email",
      autoComplete: "email",
      max: 254,
    },
  ];
  if (state.success)
    return (
      <div
        role="status"
        className="rounded-card border border-green-200 bg-green-50 p-5 text-green-800"
      >
        <p>{state.success}</p>
        <Link className="btn btn-primary mt-5 w-full" href="/admin/login">
          로그인 화면으로
        </Link>
      </div>
    );
  return (
    <form
      action={action}
      noValidate
      className="space-y-5 text-left"
      onSubmit={(event) => {
        const data = new FormData(event.currentTarget);
        const input = {
          id: String(data.get("id") ?? "").trim(),
          password: String(data.get("password") ?? ""),
          confirmPassword: String(data.get("confirmPassword") ?? ""),
          name: String(data.get("name") ?? "").trim(),
          email: googleUser?.email ?? String(data.get("email") ?? "").trim(),
        };
        const invalid = adminSignupError(input, Boolean(googleUser));
        setError(invalid);
        if (invalid) {
          event.preventDefault();
          const empty = fields.find(
            (field) => !String(data.get(field.name) ?? "").trim(),
          );
          const name =
            empty?.name ??
            (input.password !== input.confirmPassword
              ? "confirmPassword"
              : "id");
          (
            event.currentTarget.elements.namedItem(
              name,
            ) as HTMLInputElement | null
          )?.focus();
        }
      }}
    >
      {fields.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={`signup-${field.name}`}
            className="mb-2 block text-sm font-bold"
          >
            {field.label} <span className="text-brand">*</span>
          </label>
          <input
            id={`signup-${field.name}`}
            name={field.name}
            type={field.type}
            autoComplete={field.autoComplete}
            required
            maxLength={field.max}
            onChange={(event) => {
              if (field.name === "password") setPassword(event.target.value);
              if (field.name === "confirmPassword")
                setConfirmation(event.target.value);
            }}
            aria-invalid={
              field.name === "confirmPassword" && passwordMismatch
                ? true
                : undefined
            }
            readOnly={Boolean(googleUser && field.name === "email")}
            defaultValue={
              field.name === "email"
                ? googleUser?.email
                : field.name === "name"
                  ? googleUser?.name
                  : field.name === "confirmPassword" && passwordMismatch
                    ? "signup-password-mismatch"
                    : undefined
            }
            aria-describedby={
              field.name === "id"
                ? "signup-id-help"
                : field.name === "password"
                  ? "signup-password-help"
                  : undefined
            }
            className="min-h-12 w-full rounded-control border border-field-border bg-white px-4 read-only:bg-sand"
          />
          {field.name === "confirmPassword" && passwordMismatch && (
            <p
              id="signup-password-mismatch"
              role="alert"
              className="mt-2 text-sm text-danger"
            >
              비밀번호가 일치하지 않습니다.
            </p>
          )}
          {field.name === "id" && (
            <p id="signup-id-help" className="mt-2 text-xs text-ink-muted">
              4~40자 · 영문 대·소문자, 숫자, 기호 사용 가능
            </p>
          )}
          {field.name === "password" && (
            <p
              id="signup-password-help"
              className="mt-2 text-xs text-ink-muted"
            >
              12~128자 · 영문 대·소문자, 숫자, 기호 사용 가능
            </p>
          )}
        </div>
      ))}
      {(error || state.error) && (
        <p
          role="alert"
          className="rounded-control bg-danger-soft p-3 text-sm text-danger"
        >
          {error || state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full"
      >
        {pending ? "가입 신청 중…" : "회원가입하기"}
      </button>
    </form>
  );
}
