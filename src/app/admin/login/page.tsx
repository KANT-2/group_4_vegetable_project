import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAdminAccess } from "@/lib/admin-auth";
import { getGoogleLoginStatus } from "@/services/auth-settings";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { GoogleLoginButton } from "@/components/account/GoogleLoginButton";
import { adminSignOut } from "@/actions/admin-auth";

export const metadata = {
  title: "관리자 로그인",
  robots: { index: false, follow: false },
};

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await getAdminAccess();
  if (access.allowed) redirect("/admin");
  const status = await getGoogleLoginStatus();
  const { error } = await searchParams;
  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-control bg-danger-soft p-3 text-sm text-danger"
        >
          {error === "permission"
            ? "관리자 권한이 없는 Google 계정입니다."
            : "Google 로그인을 완료하지 못했어요. 다시 시도해 주세요."}
        </p>
      )}
      <AdminLoginForm />
      <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        또는
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleLoginButton next="/admin" ready={status.ready} message="" />
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">
        관리자로 등록된 Google 계정만 이용할 수 있습니다.
      </p>
      {access.signedIn && (
        <form action={adminSignOut} className="mt-3">
          <button className="min-h-11 text-sm font-bold text-brand">
            현재 Google 계정 로그아웃
          </button>
        </form>
      )}
    </>
  );
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <section className="flex min-h-screen items-center justify-center bg-sand px-4 py-12">
      <div className="w-full max-w-lg px-2 text-center sm:px-8">
        <h1 className="sr-only">관리자 로그인</h1>
        <div className="inline-flex">
          <Image
            src="/brand/motnani-admin-wordmark.png"
            alt="못난이마켓"
            width={195}
            height={81}
            priority
          />
        </div>
        <p className="mt-6 mb-8 text-sm text-ink-muted">
          관리자 계정으로 로그인해 주세요.
        </p>
        <Suspense
          fallback={<p role="status">로그인 연결을 확인하고 있어요.</p>}
        >
          <LoginContent searchParams={searchParams} />
        </Suspense>
        <Image
          src="/images/admin-login-produce.png"
          alt=""
          width={2172}
          height={724}
          className="mt-6 h-auto w-full"
        />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-sm font-bold text-brand"
          >
            고객 화면으로 ↗
          </Link>
          <Link
            href="/admin/signup"
            className="inline-flex min-h-11 items-center text-sm font-bold text-brand"
          >
            회원가입하기
          </Link>
        </div>
      </div>
    </section>
  );
}
