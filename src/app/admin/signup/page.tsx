import Image from "next/image";
import Link from "next/link";
import { AdminSignupForm } from "@/components/admin/AdminSignupForm";

export const metadata = {
  title: "관리자 회원가입",
  robots: { index: false, follow: false },
};

export default function AdminSignupPage() {
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
        <p className="mt-4 text-center text-xs text-ink-muted">
          가입 신청 후 기존 관리자의 승인이 있어야 로그인할 수 있습니다.
        </p>
        <div className="mt-8 text-center">
          <Link href="/admin/login" className="text-sm font-bold text-brand">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </section>
  );
}
