"use client";

import { useState, useTransition } from "react";
import { signIn } from "@/actions/auth";

export function EmailLoginForm({ next }: { next: string }) {
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
          const result = await signIn({
            email: form.get("email"),
            password: form.get("password"),
            next,
          });
          if (!result.ok) setError(result.error);
        });
      }}
    >
      <div>
        <label className="field-label" htmlFor="email">
          아이디 또는 이메일
        </label>
        <input
          className="field"
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          required
          disabled={pending}
          placeholder="아이디 또는 이메일을 입력해 주세요"
        />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          비밀번호
        </label>
        <input
          className="field"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          placeholder="비밀번호를 입력해 주세요"
        />
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <button
        className="btn btn-primary w-full"
        type="submit"
        disabled={pending}
      >
        {pending ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
