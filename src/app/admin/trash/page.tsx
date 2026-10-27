import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { AdminTrash } from "@/components/admin/AdminTrash";

export const metadata = {
  title: "관리자 휴지통",
  robots: { index: false, follow: false },
};
export default async function AdminTrashPage() {
  const access = await getAdminAccess();
  if (!access.allowed)
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  return <AdminTrash />;
}
