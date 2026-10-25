"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ApiError,
  formatSessionTime,
  reserve,
  type Session,
} from "@/lib/experiences-api";
import { useAuth } from "./useAuth";

type Notice = { kind: "ok" | "error"; text: string };

export function SessionReserve({
  experienceId,
  sessions,
}: {
  experienceId: string;
  sessions: Session[];
}) {
  const { auth } = useAuth();
  const router = useRouter();
  const [headcounts, setHeadcounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notices, setNotices] = useState<Record<string, Notice>>({});

  if (sessions.length === 0) {
    return <p className="mt-3 text-ink-muted">아직 열린 회차가 없어요.</p>;
  }

  async function submit(session: Session) {
    if (!auth) return;
    const headcount = headcounts[session.id] ?? 1;
    setBusy(session.id);
    try {
      await reserve(auth.token, experienceId, session.id, headcount);
      setNotices((n) => ({
        ...n,
        [session.id]: {
          kind: "ok",
          text: `${headcount}명 예약했어요. 내 예약에서 확인할 수 있어요.`,
        },
      }));
      router.refresh(); // 잔여 인원을 서버에서 다시 받아와요
    } catch (e) {
      setNotices((n) => ({
        ...n,
        [session.id]: {
          kind: "error",
          text: e instanceof ApiError ? e.message : "예약하지 못했어요.",
        },
      }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="mt-3 grid gap-3">
      {sessions.map((s) => {
        const closed = s.status === "closed";
        const full = s.remaining === 0;
        const started = new Date(s.starts_at).getTime() <= Date.now();
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
              {!unavailable && auth && (
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
                    disabled={busy === s.id}
                    onClick={() => submit(s)}
                    className="btn btn-primary"
                  >
                    {busy === s.id ? "예약 중…" : "예약하기"}
                  </button>
                </div>
              )}
              {!unavailable && !auth && (
                <p className="text-sm text-ink-muted">
                  예약하려면 로그인이 필요해요.
                </p>
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
