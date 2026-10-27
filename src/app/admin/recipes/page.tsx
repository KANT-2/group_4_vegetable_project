import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { AdminRecipes } from "@/components/admin/AdminRecipes";
import { getRecipes } from "@/services/recipes";

export const metadata = {
  title: "관리자 레시피 관리",
  robots: { index: false, follow: false },
};

export default async function AdminRecipesPage() {
  const access = await getAdminAccess();
  if (!access.allowed) {
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  }
  const recipes = await getRecipes({});
  return <AdminRecipes recipes={recipes} />;
}
