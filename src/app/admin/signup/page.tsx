import Image from "next/image";
import Link from "next/link";
import { AdminSignupForm } from "@/components/admin/AdminSignupForm";
import { GoogleLoginButton } from "@/components/account/GoogleLoginButton";
import { getGoogleLoginStatus } from "@/services/auth-settings";

export const metadata = {
  title: "관리자 회원가입",
  robots: { index: false, follow: false },
};

export default async function AdminSignupPage() {
  const google = await getGoogleLoginStatus();
  return (
    <section className="min-h-screen bg-sand px-4 py-12">
      <div className="mx-auto w-full max-w-lg sm:px-8">
        <div className="text-center">
          <Link href="/admin/login">
            <Image
              src="/brand/motnani-admin-wordmark.png"
              alt="못난이마켓"
              width={195}
              height={81}
              className="mx-auto"
            />
          </Link>
          <h1 className="mt-6 mb-8 text-2xl font-bold">관리자 회원가입</h1>
        </div>
        <AdminSignupForm />
        <div className="my-6 flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-line" />
          또는
          <span className="h-px flex-1 bg-line" />
        </div>
        <h2 className="mb-3 text-center text-sm font-bold">
          Google 연동 간편 회원가입
        </h2>
        <GoogleLoginButton
          next="/admin/signup/complete"
          ready={google.ready}
          message=""
        />
        <div className="mt-8 text-center">
          <Link href="/admin/login" className="text-sm font-bold text-brand">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </section>
  );
}
