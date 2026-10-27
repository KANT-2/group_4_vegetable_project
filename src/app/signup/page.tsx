import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/account/SignupForm";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return (
    <section className="container-page section">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <p className="mb-3 font-bold text-brand">못난이마켓</p>
        <h1 className="page-title">회원가입</h1>
        <p className="mb-8 mt-3 text-ink-muted">
          아이디와 이메일을 등록하고 못난이마켓을 이용해 보세요.
        </p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-ink-muted">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-brand">
            로그인
          </Link>
        </p>
      </div>
    </section>
  );
}
