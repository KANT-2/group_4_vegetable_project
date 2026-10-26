import Link from "next/link";
import { AdminSignupForm } from "@/components/admin/AdminSignupForm";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const metadata = {
  title: "관리자 가입 확인",
  robots: { index: false, follow: false },
};

export default async function CompleteAdminSignupPage() {
  const user = getSupabaseConfig()
    ? (await (await createClient()).auth.getUser()).data.user
    : null;
  const google =
    user?.email_confirmed_at &&
    user.identities?.some((identity) => identity.provider === "google");
  return (
    <section className="min-h-screen bg-sand px-4 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold">관리자 가입 확인</h1>
        {google && user?.email ? (
          <AdminSignupForm
            googleUser={{
              email: user.email,
              name: String(user.user_metadata?.full_name ?? ""),
            }}
          />
        ) : (
          <p role="status" className="text-ink-muted">
            이메일 인증을 완료했다면 가입 신청이 접수된 상태입니다. 관리자 승인
            후 로그인해 주세요. Google 가입은 회원가입 화면에서 Google 인증을
            먼저 진행해 주세요.
          </p>
        )}
        <Link
          href="/admin/login"
          className="mt-6 inline-block text-sm font-bold text-brand"
        >
          로그인 화면으로
        </Link>
      </div>
    </section>
  );
}
