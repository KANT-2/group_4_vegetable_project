import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { AdminPromotions } from "@/components/admin/AdminPromotions";

export const metadata = {
  title: "관리자 혜택 · 이벤트 관리",
  robots: { index: false, follow: false },
};

export default async function AdminPromotionsPage() {
  const access = await getAdminAccess();
  if (!access.allowed)
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  return <AdminPromotions />;
}
