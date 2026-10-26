"use client";
import { useActionState } from "react";
import { customerDemoLogin } from "@/actions/customer-demo";

export function CustomerDemoLoginForm() {
  const [state, action, pending] = useActionState(customerDemoLogin, {
    error: "",
  });
  return (
    <form action={action} className="mb-6 space-y-4">
      <label className="block text-sm font-bold">
        아이디
        <input
          name="id"
          required
          autoComplete="username"
          maxLength={40}
          className="mt-2 min-h-12 w-full rounded-control border border-line bg-white px-4 font-normal"
          placeholder="아이디를 입력해 주세요"
        />
      </label>
      <label className="block text-sm font-bold">
        비밀번호
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          maxLength={128}
          className="mt-2 min-h-12 w-full rounded-control border border-line bg-white px-4 font-normal"
          placeholder="비밀번호를 입력해 주세요"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn btn-primary w-full">
        {pending ? "로그인 중…" : "로그인"}
      </button>
      <div className="flex items-center gap-3 pt-2 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        또는
        <span className="h-px flex-1 bg-line" />
      </div>
    </form>
  );
}
