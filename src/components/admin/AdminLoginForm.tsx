"use client";

import { useActionState } from "react";
import { adminSignIn } from "@/actions/admin-auth";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminSignIn, { error: "" });
  return (
    <form action={action} className="space-y-4 text-left">
      <div>
        <label htmlFor="admin-id" className="mb-2 block text-sm font-bold">
          이메일
        </label>
        <input
          id="admin-id"
          name="id"
          autoComplete="username"
          required
          maxLength={100}
          inputMode="email"
          placeholder="관리자 이메일을 입력해 주세요"
          className="min-h-12 w-full rounded-control border border-field-border px-4"
        />
      </div>
      <div>
        <label
          htmlFor="admin-password"
          className="mb-2 block text-sm font-bold"
        >
          비밀번호
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          placeholder="비밀번호를 입력해 주세요"
          className="min-h-12 w-full rounded-control border border-field-border px-4"
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? "로그인 확인 중…" : "로그인"}
      </button>
    </form>
  );
}
