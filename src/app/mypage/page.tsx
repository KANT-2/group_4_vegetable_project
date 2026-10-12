import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/services/profile";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ProfileRetry } from "@/components/account/ProfileRetry";

export const metadata: Metadata = { title: "마이페이지" };

async function ProfileContent() {
  const user = await requireUser();
  let profile;
  try {
    profile = await getProfile();
  } catch {
    return <ProfileRetry />;
  }
  return (
    <ProfileForm
      key={profile.id}
      userId={profile.id}
      email={user.email ?? "이메일 정보 없음"}
      initialNickname={profile.nickname}
      initialShipping={{
        recipient_name: profile.recipient_name ?? "",
        recipient_phone: profile.recipient_phone ?? "",
        postal_code: profile.postal_code ?? "",
        address: profile.address ?? "",
        address_detail: profile.address_detail ?? "",
      }}
    />
  );
}

export default function MyPage() {
  return (
    <section className="container-page section">
      <div className="card mx-auto max-w-3xl p-6 sm:p-8">
        <h1 className="page-title">마이페이지</h1>
        <p className="mb-8 mt-3 text-ink-muted">
          내 계정 정보와 주문에 사용할 기본 배송지를 관리하세요.
        </p>
        <Suspense fallback={<p role="status">프로필을 불러오고 있어요.</p>}>
          <ProfileContent />
        </Suspense>
      </div>
    </section>
  );
}
