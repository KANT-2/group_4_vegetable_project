import { MyReservations } from "@/components/experiences/MyReservations";
import { myReservations } from "@/lib/experiences-api";
import { redirect } from "next/navigation";
import { loginPath, requireExperienceAuth } from "@/lib/experiences-auth";
import { FastApiError } from "@/lib/fastapi";
import type { Reservation } from "@/lib/experiences-types";

export const metadata = { title: "내 체험 예약" };

export default async function MyReservationsPage() {
  // 로그인하지 않았으면 /login 으로 보내고, 로그인 뒤 이 화면으로 돌아와요.
  const auth = await requireExperienceAuth("/experiences/reservations");
  let items: Reservation[] | null = null;
  let error: string | null = null;
  let unauthorized = false;
  try {
    items = await myReservations(auth.token);
  } catch (e) {
    unauthorized = e instanceof FastApiError && e.status === 401;
    error =
      e instanceof FastApiError
        ? e.message
        : "예약을 불러오지 못했어요. 백엔드가 켜져 있는지 확인해 주세요.";
  }

  // 로그아웃·만료된 토큰이면 FastAPI 가 401 을 주므로 다시 로그인하게 해요.
  if (unauthorized) redirect(loginPath("/experiences/reservations"));

  return (
    <>
      <h1 className="text-[1.375rem] font-extrabold text-ink md:text-[1.75rem]">
        내 예약
      </h1>
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-card bg-danger-soft p-4 text-danger"
        >
          {error}
        </p>
      ) : (
        <MyReservations items={items ?? []} />
      )}
    </>
  );
}
