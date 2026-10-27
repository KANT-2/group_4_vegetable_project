"use client";

import { useActionState } from "react";
import { updateAdminName } from "@/actions/admin-profile";
import { AdminProducts } from "./AdminProducts";
import { AdminPasswordForm } from "./AdminPasswordForm";

export type AdminProfileView = {
  id: string;
  name: string;
  email: string;
  method: string;
  editable: boolean;
  local: boolean;
  googleOnly?: boolean;
  fastApi?: boolean;
};

export function AdminMyPage({ profile }: { profile: AdminProfileView }) {
  const [state, action, pending] = useActionState(updateAdminName, {
    error: "",
    success: "",
  });
  const field =
    "mt-2 min-h-12 w-full rounded-control border border-line bg-white px-4 text-base read-only:bg-sand read-only:text-ink-muted";
  return (
    <AdminProducts
      view="mypage"
      description="내 관리자 계정 정보를 확인하고 관리해요."
      topNotice={
        state.success && (
          <p
            role="status"
            className="mb-5 rounded-card border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          >
            {state.success}
          </p>
        )
      }
    >
      <div className="mt-7 grid items-start gap-6 xl:grid-cols-2">
        <section className="min-w-0 rounded-card border border-line bg-white p-6 sm:p-8">
          <div className="flex items-center gap-4 border-b border-line pb-6">
            <div
              className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-xl font-bold text-brand"
              aria-hidden="true"
            >
              {(profile.name || "관리자").slice(0, 1)}
            </div>
            <div>
              <h2 className="text-xl font-bold">내 정보</h2>
              <p className="mt-1 text-sm text-ink-muted">{profile.method}</p>
            </div>
            <span className="ml-auto rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
              관리자
            </span>
          </div>
          <form action={action} className="mt-6 space-y-6">
            <label className="block text-sm font-bold">
              아이디
              <input readOnly value={profile.id} className={field} />
            </label>
            <label className="block text-sm font-bold">
              이름
              <input
                name="name"
                defaultValue={profile.name}
                readOnly={!profile.editable}
                required
                minLength={profile.fastApi ? 2 : 1}
                maxLength={profile.fastApi ? 20 : 60}
                autoComplete="name"
                className={field}
              />
            </label>
            <label className="block text-sm font-bold">
              이메일
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                readOnly={!profile.editable || profile.fastApi}
                defaultValue={profile.email === "미등록" ? "" : profile.email}
                placeholder="이메일을 입력해 주세요"
                className={field}
              />
            </label>
            <label className="block text-sm font-bold">
              로그인 방식
              <input readOnly value={profile.method} className={field} />
            </label>
            {!profile.local && !profile.editable && (
              <p className="text-sm text-ink-muted">
                계정 정보는 조회할 수 있지만 이름 수정은 관리자 가입 설정을
                완료한 후 이용할 수 있어요.
              </p>
            )}
            {state.error && (
              <p role="alert" className="text-sm text-danger">
                {state.error}
              </p>
            )}
            <div className="flex justify-end border-t border-line pt-5">
              <button
                disabled={pending || !profile.editable}
                className="btn btn-primary"
              >
                {pending ? "저장 중…" : "저장"}
              </button>
            </div>
          </form>
        </section>
        <AdminPasswordForm googleOnly={profile.googleOnly ?? false} fastApi={profile.fastApi} />
      </div>
    </AdminProducts>
  );
}
