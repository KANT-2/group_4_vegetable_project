import { ExperienceSubNav } from "@/components/experiences/ExperienceSubNav";
import { getExperienceAuth } from "@/lib/experiences-auth";

// 체험 예약 화면 공통 틀: 하위 메뉴. 관리자일 때만 '예약 운영' 메뉴가 보여요.
export default async function ExperiencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getExperienceAuth().catch(() => null);
  return (
    <div className="container-page py-6">
      <ExperienceSubNav isAdmin={auth?.role === "admin"} />
      {children}
    </div>
  );
}
