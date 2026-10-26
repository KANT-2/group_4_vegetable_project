import { AdminReservations } from "@/components/experiences/AdminReservations";

export const metadata = { title: "체험 예약 운영" };

export default function AdminExperiencesPage() {
  return (
    <>
      <h1 className="text-[1.375rem] font-extrabold text-ink md:text-[1.75rem]">
        예약 운영
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        회차별 예약을 확인하고 접수를 마감해요. 관리자만 볼 수 있어요.
      </p>
      <AdminReservations />
    </>
  );
}
