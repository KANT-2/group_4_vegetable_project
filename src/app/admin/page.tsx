import { AdminProducts } from "@/components/admin/AdminProducts";
import { getAdminAccess } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "관리자 상품 관리",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access.allowed)
    redirect(
      access.signedIn ? "/admin/login?error=permission" : "/admin/login",
    );
  const params = await searchParams;
  return (
    <>
      {/* 실제 DB 모드에서도 같은 화면이에요. 저장은 /admin/api/content 가 Supabase(FastAPI)에 반영해요. */}
      <AdminProducts />
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
