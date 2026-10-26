import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { AdminProducts } from "@/components/admin/AdminProducts";
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
  return (
    <AdminProducts view="reviews">
      <AdminReviews />
    </AdminProducts>
  );
}
