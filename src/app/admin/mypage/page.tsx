import { redirect } from "next/navigation";
import {
  getAdminAccess,
  hasPasswordSession,
  getSessionAdminProfile,
} from "@/lib/admin-auth";
import { getCurrentUser } from "@/lib/auth";
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
  const profile: AdminProfileView = {
    id: user.username ?? "Google 계정",
    name: user.profile.nickname,
    email: user.email ?? "미등록",
    method: user.username ? "아이디 · 비밀번호 로그인" : "Google 연동 로그인",
    editable: true,
    local: false,
    fastApi: true,
    googleOnly: !user.username,
  };
  return <AdminMyPage profile={profile} />;
}
