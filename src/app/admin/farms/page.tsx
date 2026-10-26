import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { AdminFarms } from "@/components/admin/AdminFarms";
import { getFarmStories } from "@/services/showcase";

export const metadata = {
  title: "관리자 농가 관리",
  robots: { index: false, follow: false },
};
export default async function AdminFarmsPage() {
  const access = await getAdminAccess();
  if (!access.allowed)
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  const farms = await getFarmStories();
  return <AdminFarms farms={farms} />;
}
