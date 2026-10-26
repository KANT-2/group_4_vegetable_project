import { AdminProducts } from "@/components/admin/AdminProducts";
import { getAdminAccess } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { isFastApiCatalog } from "@/lib/catalog-mode";
import { CatalogProductManager } from "@/components/admin/CatalogProductManager";

export const metadata = {
  title: "관리자 상품 관리",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    q?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const access = await getAdminAccess();
  if (!access.allowed)
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  const params = await searchParams;
  return (
    <>
      <AdminProducts>
        {isFastApiCatalog() ? (
          <CatalogProductManager params={params} />
        ) : undefined}
      </AdminProducts>
      {params.error === "logout" && (
        <p
          role="alert"
          className="fixed bottom-5 left-5 rounded-card bg-danger-soft p-4 text-danger"
        >
          로그아웃에 실패했습니다. 다시 시도해 주세요.
        </p>
      )}
    </>
  );
}
