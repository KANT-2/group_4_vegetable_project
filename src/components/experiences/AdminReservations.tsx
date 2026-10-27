"use client";

import { useState, useTransition } from "react";
import { closeSessionAction } from "@/actions/experiences";
import {
  formatSessionTime,
  type ExperienceDetail,
  type Reservation,
} from "@/lib/experiences-types";

export function AdminReservations({
  experiences,
  reservations,
}: {
  experiences: ExperienceDetail[];
  reservations: Reservation[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function close(sessionId: string) {
    if (
      !window.confirm(
        "이 회차의 접수를 마감할까요? 마감하면 새 예약을 받지 않아요.",
      )
    )
      return;
    setPendingId(sessionId);
    setMessage(null);
    startTransition(async () => {
      const result = await closeSessionAction(sessionId);
      setMessage(result.ok ? "접수를 마감했어요." : result.error);
      setPendingId(null);
    });
  }

  return (
    <div className="mt-4 grid gap-6">
      {message && (
        <p
          role="status"
          className="rounded-card bg-brand-soft p-3 text-sm text-brand-dark"
        >
          {message}
        </p>
      )}
      {experiences.map((e) => (
        <section key={e.id}>
          <h2 className="text-lg font-extrabold text-ink">{e.title}</h2>
          <ul className="mt-2 grid gap-3">
            {e.sessions.map((s) => {
              const rows = reservations.filter((r) => r.session_id === s.id);
              const active = rows.filter((r) => r.status === "reserved");
              return (
                <li
                  key={s.id}
                  className="rounded-card bg-surface p-4 ring-1 ring-line"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">
                        {formatSessionTime(s.starts_at)}
                      </p>
                      <p className="text-sm text-ink-muted">
                        예약 {active.reduce((n, r) => n + r.headcount, 0)}명 /
                        정원 {s.capacity}명 · 잔여 {s.remaining}명
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${s.status === "open" ? "bg-brand-soft text-brand-dark" : "bg-sand text-ink-muted"}`}
                    >
                      {s.status === "open" ? "접수 중" : "접수 마감"}
                    </span>
                    {s.status === "open" && (
                      <button
                        type="button"
                        disabled={pendingId === s.id}
                        onClick={() => close(s.id)}
                        className="btn btn-secondary"
                      >
                        {pendingId === s.id ? "마감 중…" : "접수 마감"}
                      </button>
                    )}
                  </div>
                  {rows.length > 0 ? (
                    <ul className="mt-3 divide-y divide-line border-t border-line text-sm">
                      {rows.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap justify-between gap-2 py-2"
                        >
                          <span className="font-mono text-xs text-ink-muted">
                            {r.user_id.slice(0, 8)}
                          </span>
                          <span>{r.headcount}명</span>
                          <span
                            className={
                              r.status === "reserved"
                                ? "text-brand-dark"
                                : "text-ink-muted"
                            }
                          >
                            {r.status === "reserved" ? "예약 완료" : "취소됨"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
                      아직 예약이 없어요.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
