"use client";

// 개발용 임시 로그인 막대: 지나의 로그인 연결 전에 체험 예약 화면을 끝까지 시험하기 위한 도구예요.
// 백엔드가 로컬 개발 모드(APP_ENV=local)가 아니면 임시 로그인이 없어서 이 막대는 보이지 않아요.
import { useEffect, useState } from "react";
import {
  API_BASE,
  clearToken,
  fetchDevToken,
  saveToken,
} from "@/lib/experiences-api";
import { useAuth } from "./useAuth";

export function DevLoginBar() {
  const { auth, ready } = useAuth();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 임시 로그인 경로가 백엔드에 있는지 한 번 확인해요. (없으면 막대를 숨겨요)
    let alive = true;
    fetch(`${API_BASE}/openapi.json`)
      .then((r) => r.json())
      .then(
        (doc) =>
          alive && setAvailable(Boolean(doc?.paths?.["/api/v1/dev/token"])),
      )
      .catch(() => alive && setAvailable(false));
    return () => {
      alive = false;
    };
  }, []);

  if (!ready || !available) return null;

  async function login(role: "user" | "admin") {
    setBusy(true);
    const t = await fetchDevToken(role);
    setBusy(false);
    if (t) saveToken(t.access_token, t.role);
  }

  return (
    <div
      role="note"
      className="mb-4 flex flex-wrap items-center gap-2 rounded-card bg-brand-soft px-4 py-3 text-sm text-brand-dark ring-1 ring-brand/20"
    >
      <span className="font-bold">개발용 임시 로그인</span>
      <span className="text-ink-muted">
        {auth
          ? `현재: ${auth.role === "admin" ? "관리자" : "일반 사용자"}`
          : "로그인하지 않았어요"}
      </span>
      <span className="ml-auto flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => login("user")}
          className="btn btn-secondary min-h-9 px-3 text-sm"
        >
          일반 사용자
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => login("admin")}
          className="btn btn-secondary min-h-9 px-3 text-sm"
        >
          관리자
        </button>
        {auth && (
          <button
            type="button"
            onClick={clearToken}
            className="btn btn-secondary min-h-9 px-3 text-sm"
          >
            로그아웃
          </button>
        )}
      </span>
    </div>
  );
}
