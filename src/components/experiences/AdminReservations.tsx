"use client";

import { useEffect, useState } from "react";
import {
  adminReservations,
  ApiError,
  closeSession,
  formatSessionTime,
  getExperience,
  listExperiences,
  type ExperienceDetail,
  type Reservation,
} from "@/lib/experiences-api";
import { useAuth } from "./useAuth";

export function AdminReservations() {
  const { auth, ready } = useAuth();
  const [experiences, setExperiences] = useState<ExperienceDetail[] | null>(
    null,
  );
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const token = auth?.token;
  const isAdmin = auth?.role === "admin";
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!token || !isAdmin) return;
    let alive = true;
    Promise.all([
      listExperiences({ size: 100 }).then((p) =>
        Promise.all(p.items.map((e) => getExperience(e.id))),
      ),
      adminReservations(token, { size: 100 }),
    ])
      .then(([list, rows]) => {
        if (!alive) return;
        setExperiences(list);
        setReservations(rows.items);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setExperiences(null);
        setError(
          e instanceof ApiError ? e.message : "예약 정보를 불러오지 못했어요.",
        );
      });
    return () => {
      alive = false;
    };
  }, [token, isAdmin, version]);

  if (!ready) return <p className="mt-6 text-ink-muted">불러오는 중…</p>;
  if (!token)
    return (
      <p className="mt-6 rounded-card bg-sand p-6 text-center text-ink-muted">
        관리자로 로그인해 주세요.
      </p>
    );
  if (!isAdmin)
    return (
      <p
        role="alert"
        className="mt-6 rounded-card bg-danger-soft p-6 text-center text-danger"
      >
        관리자만 사용할 수 있어요.
      </p>
    );

  async function close(sessionId: string) {
    if (
      !token ||
      !window.confirm(
        "이 회차의 접수를 마감할까요? 마감하면 새 예약을 받지 않아요.",
      )
    )
      return;
    setBusy(sessionId);
    setMessage(null);
    try {
      await closeSession(token, sessionId);
      setMessage("접수를 마감했어요.");
      reload();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "마감하지 못했어요.");
    } finally {
      setBusy(null);
    }
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
      {error && (
        <p role="alert" className="rounded-card bg-danger-soft p-4 text-danger">
          {error}
        </p>
      )}
      {experiences?.map((e) => (
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
                        disabled={busy === s.id}
                        onClick={() => close(s.id)}
                        className="btn btn-secondary"
                      >
                        {busy === s.id ? "마감 중…" : "접수 마감"}
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
