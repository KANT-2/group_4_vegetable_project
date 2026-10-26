import { Suspense } from "react";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/services/profile";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ProfileRetry } from "@/components/account/ProfileRetry";
import { AccountLayout } from "@/components/account/AccountLayout";
import { getCustomerDemo } from "@/lib/customer-demo";
import { CustomerDemoMyPage } from "@/components/account/CustomerDemoMyPage";
import { PasswordChangeForm } from "@/components/account/PasswordChangeForm";

export const metadata: Metadata = { title: "마이페이지" };

async function ProfileContent() {
  const demo = await getCustomerDemo();
  if (demo) return <CustomerDemoMyPage profile={demo} />;
  const user = await requireUser();
  let profile;
  try {
    profile = await getProfile();
  } catch {
    return <ProfileRetry />;
  }
  return (
    <div className="space-y-6">
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
      <PasswordChangeForm
        googleOnly={
          "identities" in user && !user.identities?.some((identity) => identity.provider === "email")
        }
      />
    </div>
  );
}

export default function MyPage() {
  return (
    <AccountLayout
      active="profile"
      title="회원 정보·배송지"
      description="내 정보와 다음 장보기를 위한 기본 배송지를 관리하세요."
    >
      <Suspense
        fallback={
          <p role="status" className="rounded-xl bg-surface p-6">
            프로필을 불러오고 있어요.
          </p>
        }
      >
        <ProfileContent />
      </Suspense>
    </AccountLayout>
  );
}
