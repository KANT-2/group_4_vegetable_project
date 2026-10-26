import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { AdminReviews } from "@/components/admin/AdminReviews";

export const metadata = {
  title: "관리자 리뷰 관리",
  robots: { index: false, follow: false },
};
export default async function ReviewsPage() {
  const access = await getAdminAccess();
  if (!access.allowed)
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  // AdminReviews 가 관리자 화면 틀(AdminProducts)까지 그려요(처리 알림을 제목 위에 두려고).
  return <AdminReviews />;
}
