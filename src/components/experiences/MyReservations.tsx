"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ApiError,
  cancelReservation,
  formatSessionTime,
  myReservations,
  type Reservation,
} from "@/lib/experiences-api";
import { useAuth } from "./useAuth";

const STATUS_LABEL = { reserved: "예약 완료", cancelled: "취소됨" } as const;

export function MyReservations() {
  const { auth, ready } = useAuth();
  const [items, setItems] = useState<Reservation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const token = auth?.token;
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    myReservations(token)
      .then((rows) => {
        if (!alive) return;
        setItems(rows);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setItems(null);
        setError(
          e instanceof ApiError ? e.message : "예약을 불러오지 못했어요.",
        );
      });
    return () => {
      alive = false;
    };
  }, [token, version]);

  if (!ready) return <p className="mt-6 text-ink-muted">불러오는 중…</p>;
  if (!token)
    return (
      <p className="mt-6 rounded-card bg-sand p-6 text-center text-ink-muted">
        로그인하면 내 예약을 볼 수 있어요.
      </p>
    );

  async function cancel(r: Reservation) {
    if (!token || !window.confirm("이 예약을 취소할까요?")) return;
    setBusy(r.id);
    setMessage(null);
    try {
      await cancelReservation(token, r.id);
      setMessage("예약을 취소했어요.");
      reload();
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : "취소하지 못했어요.");
    } finally {
      setBusy(null);
    }
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
      {error && (
        <p role="alert" className="rounded-card bg-danger-soft p-4 text-danger">
          {error}
        </p>
      )}
      {items && items.length === 0 && (
        <div className="rounded-card bg-surface p-10 text-center ring-1 ring-line">
          <p className="font-bold text-ink">아직 예약한 체험이 없어요.</p>
          <Link href="/experiences" className="mt-4 btn btn-primary">
            체험 둘러보기
          </Link>
        </div>
      )}
      {items && items.length > 0 && (
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
                  disabled={busy === r.id}
                  onClick={() => cancel(r)}
                  className="btn btn-secondary"
                >
                  {busy === r.id ? "취소 중…" : "예약 취소"}
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
