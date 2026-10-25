import { DevLoginBar } from "@/components/experiences/DevLoginBar";
import { ExperienceSubNav } from "@/components/experiences/ExperienceSubNav";

// 체험 예약 화면 공통 틀: 개발용 임시 로그인 막대 + 하위 메뉴
export default function ExperiencesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-6">
      <DevLoginBar />
      <ExperienceSubNav />
      {children}
    </div>
  );
}
