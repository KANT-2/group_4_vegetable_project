"use client";

import { useState, useTransition } from "react";
import { signUp } from "@/actions/auth";

export function SignupForm() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        if (pending) return;
        const form = new FormData(event.currentTarget);
        setError("");
        startTransition(async () => {
          const result = await signUp({
            username: form.get("username"),
            email: form.get("email"),
            nickname: form.get("nickname"),
            password: form.get("password"),
            confirmPassword: form.get("confirmPassword"),
          });
          if (!result.ok) setError(result.error);
        });
      }}
    >
      {[
        ["username", "아이디", "text", "영문·숫자·._- 조합 4~40자"],
        ["email", "이메일", "email", "example@email.com"],
        ["nickname", "닉네임", "text", "2~20자"],
        ["password", "비밀번호", "password", "8자 이상"],
        ["confirmPassword", "비밀번호 확인", "password", "비밀번호 재입력"],
      ].map(([name, label, type, placeholder]) => (
        <div key={name}>
          <label className="field-label" htmlFor={`signup-${name}`}>
            {label}
          </label>
          <input
            className="field"
            id={`signup-${name}`}
            name={name}
            type={type}
            placeholder={placeholder}
            autoComplete={
              name === "username"
                ? "username"
                : name === "email"
                  ? "email"
                  : name === "nickname"
                    ? "nickname"
                    : "new-password"
            }
            required
            disabled={pending}
          />
        </div>
      ))}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "가입 중…" : "회원가입"}
      </button>
    </form>
  );
}
