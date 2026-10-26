import { MyReservations } from "@/components/experiences/MyReservations";

export const metadata = { title: "내 체험 예약" };

export default function MyReservationsPage() {
  return (
    <>
      <h1 className="text-[1.375rem] font-extrabold text-ink md:text-[1.75rem]">
        내 예약
      </h1>
      <MyReservations />
    </>
  );
}
