import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { loginNext } from "@/lib/auth-urls";
import { getGoogleLoginStatus } from "@/services/auth-settings";
import { GoogleLoginButton } from "@/components/account/GoogleLoginButton";
import { EmailLoginForm } from "@/components/account/EmailLoginForm";
import { getCustomerDemo } from "@/lib/customer-demo";

export const metadata: Metadata = { title: "로그인" };
type SearchParams = Promise<{
  next?: string | string[];
  error?: string | string[];
  registered?: string | string[];
}>;

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  if (await getCustomerDemo()) redirect("/");
  const next = loginNext(
    typeof params.next === "string" ? params.next : undefined,
  );
  const user = await getCurrentUser();
  if (user && !params.error) redirect(next);
  const status = await getGoogleLoginStatus();
  return (
    <>
      {params.error && (
        <p
          className="mb-6 rounded-control bg-danger-soft p-4 text-danger"
          role="alert"
        >
          로그인을 완료하지 못했어요. 취소했거나 연결이 만료되었을 수 있어요.
          다시 시도해 주세요.
        </p>
      )}
      {params.registered === "1" && (
        <p
          className="mb-6 rounded-control bg-green-50 p-4 text-green-800"
          role="status"
        >
          회원가입이 완료되었습니다. 새 계정으로 로그인해 주세요.
        </p>
      )}
      <EmailLoginForm next={next} />
      <div className="my-6 flex items-center gap-3 text-sm text-ink-muted">
        <span className="h-px flex-1 bg-line" />
        <span>또는 Google로 로그인</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <GoogleLoginButton
        next={next}
        ready={status.ready}
        message={status.message}
      />
    </>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <section className="container-page section">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <p className="mb-3 font-bold text-brand">못난이마켓</p>
        <h1 className="page-title">반가워요!</h1>
        <p className="mb-8 mt-3 text-ink-muted">
          아이디·이메일 또는 Google 계정으로 로그인하고
          <br />
          나만의 장바구니와 찜을 이어가세요.
        </p>
        <Suspense
          fallback={<p aria-live="polite">로그인 연결을 확인하고 있어요.</p>}
        >
          <LoginContent searchParams={searchParams} />
        </Suspense>
        <p className="mt-6 text-sm text-ink-muted">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-bold text-brand">
            회원가입
          </Link>
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-12 items-center font-bold text-brand"
        >
          로그인 없이 둘러보기 →
        </Link>
      </div>
    </section>
  );
}
