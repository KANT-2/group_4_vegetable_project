import { AdminReservations } from "@/components/experiences/AdminReservations";
import {
  adminReservations,
  getExperience,
  listExperiences,
} from "@/lib/experiences-api";
import { redirect } from "next/navigation";
import { loginPath, requireExperienceAuth } from "@/lib/experiences-auth";
import { FastApiError } from "@/lib/fastapi";
import type { ExperienceDetail, Reservation } from "@/lib/experiences-types";

export const metadata = { title: "체험 예약 운영" };

export default async function AdminExperiencesPage() {
  const auth = await requireExperienceAuth("/experiences/admin");
  let body: React.ReactNode;
  if (auth.role !== "admin") {
    body = (
      <p
        role="alert"
        className="mt-6 rounded-card bg-danger-soft p-6 text-center text-danger"
      >
        관리자만 사용할 수 있어요.
      </p>
    );
  } else {
    let experiences: ExperienceDetail[] | null = null;
    let reservations: Reservation[] = [];
    let error: string | null = null;
    let unauthorized = false;
    try {
      const [list, rows] = await Promise.all([
        listExperiences({ size: 100 }).then((p) =>
          Promise.all(p.items.map((e) => getExperience(e.id))),
        ),
        adminReservations(auth.token, { size: 100 }),
      ]);
      experiences = list;
      reservations = rows.items;
    } catch (e) {
      unauthorized = e instanceof FastApiError && e.status === 401;
      error =
        e instanceof FastApiError
          ? e.message
          : "예약 정보를 불러오지 못했어요. 백엔드가 켜져 있는지 확인해 주세요.";
    }
    if (unauthorized) redirect(loginPath("/experiences/admin"));
    body = error ? (
      <p
        role="alert"
        className="mt-4 rounded-card bg-danger-soft p-4 text-danger"
      >
        {error}
      </p>
    ) : (
      <AdminReservations
        experiences={experiences ?? []}
        reservations={reservations}
      />
    );
  }

  return (
    <>
      <h1 className="text-[1.375rem] font-extrabold text-ink md:text-[1.75rem]">
        예약 운영
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        회차별 예약을 확인하고 접수를 마감해요. 관리자만 볼 수 있어요.
      </p>
      {body}
    </>
  );
}
