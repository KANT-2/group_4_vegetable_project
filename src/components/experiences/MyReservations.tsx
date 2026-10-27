"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { cancelReservationAction } from "@/actions/experiences";
import { formatSessionTime, type Reservation } from "@/lib/experiences-types";

const STATUS_LABEL = { reserved: "예약 완료", cancelled: "취소됨" } as const;

export function MyReservations({ items }: { items: Reservation[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function cancel(r: Reservation) {
    if (!window.confirm("이 예약을 취소할까요?")) return;
    setPendingId(r.id);
    setMessage(null);
    startTransition(async () => {
      const result = await cancelReservationAction(r.id);
      setMessage(result.ok ? "예약을 취소했어요." : result.error);
      setPendingId(null);
    });
  }

  return (
    <div className="mt-4">
      {message && (
        <p
          role="status"
          className="mb-3 rounded-card bg-brand-soft p-3 text-sm text-brand-dark"
        >
          {message}
        </p>
      )}
      {items.length === 0 ? (
        <div className="rounded-card bg-surface p-10 text-center ring-1 ring-line">
          <p className="font-bold text-ink">아직 예약한 체험이 없어요.</p>
          <Link href="/experiences" className="mt-4 btn btn-primary">
            체험 둘러보기
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 ring-1 ring-line"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/experiences/${r.experience_id}`}
                  className="font-bold text-ink hover:text-brand"
                >
                  {r.experience_title}
                </Link>
                <p className="text-sm text-ink-muted">
                  {formatSessionTime(r.starts_at)} · {r.headcount}명
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${r.status === "reserved" ? "bg-brand-soft text-brand-dark" : "bg-sand text-ink-muted"}`}
              >
                {STATUS_LABEL[r.status]}
              </span>
              {r.status === "reserved" && (
                <button
                  type="button"
                  disabled={pendingId === r.id}
                  onClick={() => cancel(r)}
                  className="btn btn-secondary"
                >
                  {pendingId === r.id ? "취소 중…" : "예약 취소"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-xs text-ink-muted">
        체험 시작 24시간 전까지만 취소할 수 있어요.
      </p>
    </div>
  );
}
