"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { reserveAction } from "@/actions/experiences";
import { formatSessionTime, type Session } from "@/lib/experiences-types";

type Notice = { kind: "ok" | "error"; text: string };

export function SessionReserve({
  experienceId,
  sessions,
  loggedIn,
}: {
  experienceId: string;
  sessions: Session[];
  loggedIn: boolean;
}) {
  const [headcounts, setHeadcounts] = useState<Record<string, number>>({});
  const [notices, setNotices] = useState<Record<string, Notice>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  // 이 화면에서 방금 예약한 회차: 같은 회차를 또 누르지 못하게 "예약 완료"로 보여줘요.
  const [reservedIds, setReservedIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  if (sessions.length === 0) {
    return <p className="mt-3 text-ink-muted">아직 열린 회차가 없어요.</p>;
  }

  function submit(session: Session) {
    const headcount = headcounts[session.id] ?? 1;
    setPendingId(session.id);
    startTransition(async () => {
      const result = await reserveAction(experienceId, session.id, headcount);
      setNotices((n) => ({
        ...n,
        [session.id]: result.ok
          ? { kind: "ok", text: `${headcount}명 예약했어요.` }
          : { kind: "error", text: result.error },
      }));
      if (result.ok) setReservedIds((ids) => [...ids, session.id]);
      setPendingId(null);
    });
  }

  const loginHref = `/login?next=${encodeURIComponent(`/experiences/${experienceId}`)}`;

  return (
    <ul className="mt-3 grid gap-3">
      {sessions.map((s) => {
        const closed = s.status === "closed";
        const full = s.remaining === 0;
        const started = s.started ?? false;
        const unavailable = closed || full || started;
        const max = Math.min(10, Math.max(s.remaining, 1));
        const notice = notices[s.id];
        return (
          <li
            key={s.id}
            className="rounded-card bg-surface p-4 ring-1 ring-line"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">
                  {formatSessionTime(s.starts_at)}
                </p>
                <p className="text-sm text-ink-muted">
                  {closed
                    ? "접수 마감"
                    : started
                      ? "시작한 회차"
                      : full
                        ? "정원 마감"
                        : `잔여 ${s.remaining}명 / 정원 ${s.capacity}명`}
                </p>
              </div>
              {!unavailable && loggedIn && (
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  <label
                    className="text-sm text-ink-muted"
                    htmlFor={`hc-${s.id}`}
                  >
                    인원
                  </label>
                  <select
                    id={`hc-${s.id}`}
                    value={headcounts[s.id] ?? 1}
                    onChange={(e) =>
                      setHeadcounts((h) => ({
                        ...h,
                        [s.id]: Number(e.target.value),
                      }))
                    }
                    className="h-11 rounded-[0.375rem] border border-field-border bg-surface px-3"
                  >
                    {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}명
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pendingId === s.id || reservedIds.includes(s.id)}
                    onClick={() => submit(s)}
                    className="btn btn-primary"
                  >
                    {pendingId === s.id
                      ? "예약 중…"
                      : reservedIds.includes(s.id)
                        ? "예약 완료"
                        : "예약하기"}
                  </button>
                </div>
              )}
              {!unavailable && !loggedIn && (
                <Link href={loginHref} className="btn btn-secondary">
                  로그인하고 예약하기
                </Link>
              )}
            </div>
            {notice && (
              <p
                role={notice.kind === "error" ? "alert" : "status"}
                className={`mt-3 text-sm ${notice.kind === "error" ? "text-danger" : "text-brand-dark"}`}
              >
                {notice.text}{" "}
                {notice.kind === "ok" && (
                  <Link
                    href="/experiences/reservations"
                    className="font-bold underline"
                  >
                    내 예약 보기
                  </Link>
                )}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
