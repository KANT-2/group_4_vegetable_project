import "server-only";
// 체험 예약 FastAPI 호출 모음 (형준 담당). 서버 컴포넌트·서버 액션에서만 불러요.
// 로그인 토큰은 지나의 로그인과 같은 httpOnly 쿠키에 있고, 서버가 읽어서 Bearer 로 보내요.
import { fastApi } from "@/lib/fastapi";
import type {
  Experience,
  ExperienceDetail,
  Page,
  Reservation,
  Session,
} from "@/lib/experiences-types";

const BASE = "/api/v1/experiences";

function query(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// --- 공개 조회 ---
export function listExperiences(params: {
  q?: string;
  region?: string;
  page?: number;
  size?: number;
}) {
  return fastApi<Page<Experience>>(`${BASE}${query(params)}`);
}

export async function getExperience(id: string) {
  const detail = await fastApi<ExperienceDetail>(
    `${BASE}/${encodeURIComponent(id)}`,
  );
  const now = Date.now();
  return {
    ...detail,
    sessions: detail.sessions.map((s) => ({
      ...s,
      started: new Date(s.starts_at).getTime() <= now,
    })),
  };
}

// --- 로그인 필요 ---
export function reserve(
  token: string,
  experienceId: string,
  sessionId: string,
  headcount: number,
) {
  return fastApi<Reservation>(
    `${BASE}/${encodeURIComponent(experienceId)}/sessions/${sessionId}/reservations`,
    { method: "POST", body: JSON.stringify({ headcount }) },
    token,
  );
}

export function myReservations(token: string) {
  return fastApi<Reservation[]>(`${BASE}/reservations/me`, {}, token);
}

export function cancelReservation(token: string, reservationId: string) {
  return fastApi<Reservation>(
    `${BASE}/reservations/${reservationId}/cancel`,
    { method: "POST" },
    token,
  );
}

// --- 관리자 ---
export function adminReservations(
  token: string,
  params: { session_id?: string; status?: string; size?: number } = {},
) {
  return fastApi<Page<Reservation>>(
    `${BASE}/admin/reservations${query(params)}`,
    {},
    token,
  );
}

export function closeSession(token: string, sessionId: string) {
  return fastApi<Session>(
    `${BASE}/admin/sessions/${sessionId}/close`,
    { method: "POST" },
    token,
  );
}
