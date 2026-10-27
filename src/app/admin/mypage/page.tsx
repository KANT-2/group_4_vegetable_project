import { redirect } from "next/navigation";
import {
  getAdminAccess,
  hasPasswordSession,
  getSessionAdminProfile,
} from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";
import { adminRegistrationClient } from "@/lib/admin-registration-server";
import {
  AdminMyPage,
  type AdminProfileView,
} from "@/components/admin/AdminMyPage";

export const metadata = {
  title: "관리자 마이페이지",
  robots: { index: false, follow: false },
};

export default async function AdminMyPagePage() {
  const access = await getAdminAccess();
  if (!access.allowed)
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  const sessionProfile = await getSessionAdminProfile();
  if (await hasPasswordSession())
    return (
      <AdminMyPage
        profile={{
          id: process.env.ADMIN_LOGIN_ID || "admin",
          name: sessionProfile?.name ?? "관리자",
          email: sessionProfile?.email ?? "",
          method: "관리자 전용 아이디 로그인",
          editable: true,
          local: true,
        }}
      />
    );
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const fastApiUser = "profile" in user ? user : null;
  const profile: AdminProfileView = {
    id: fastApiUser?.username ?? "Google 계정",
    name: fastApiUser?.profile.nickname ?? String(
      ("user_metadata" in user ? user.user_metadata?.full_name ?? user.user_metadata?.name : undefined) ?? "관리자",
    ),
    email: user.email ?? "미등록",
    method:
      "app_metadata" in user && user.app_metadata?.provider === "google"
        ? "Google 연동 로그인"
        : "아이디 · 비밀번호 로그인",
    editable: Boolean(fastApiUser),
    local: false,
    googleOnly: "identities" in user && !user.identities?.some(
      (identity) => identity.provider === "email",
    ),
  };
  if (!fastApiUser) try {
    const registry = adminRegistrationClient();
    const { data, error } = await registry
      .from("admin_registrations")
      .select("username,display_name,status")
      .eq("id", user.id)
      .maybeSingle();
    if (!error && data) {
      profile.id = data.username;
      profile.name = data.display_name;
      profile.editable = data.status === "approved";
    }
  } catch {
    /* 설정 전에도 인증된 본인의 기본 계정 정보는 조회합니다. */
  }
  return <AdminMyPage profile={profile} />;
}
