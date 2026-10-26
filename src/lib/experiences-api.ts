// 체험 예약 FastAPI 호출 모음 (형준 담당 화면에서만 사용)
// - 서버 컴포넌트와 브라우저 모두 NEXT_PUBLIC_API_BASE_URL 로 FastAPI 를 호출해요. (공개값만 사용)
// - 로그인 토큰은 브라우저 localStorage 에 두고 Authorization: Bearer 로 보내요.
//   지금 토큰은 개발용 임시 로그인으로 받아요. 지나의 로그인이 연결되면 getToken/saveToken 만 바꿔요.

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
const BASE = `${API_BASE}/api/v1/experiences`;

export type Experience = {
  id: string;
  title: string;
  description: string;
  farm_name: string;
  region: string;
  fee: number;
  image_path: string | null;
};

export type Session = {
  id: string;
  experience_id: string;
  starts_at: string;
  capacity: number;
  remaining: number;
  status: "open" | "closed";
};

export type ExperienceDetail = Experience & { sessions: Session[] };

export type Reservation = {
  id: string;
  session_id: string;
  user_id: string;
  headcount: number;
  status: "reserved" | "cancelled";
  created_at: string | null;
  cancelled_at: string | null;
  experience_id: string;
  experience_title: string;
  starts_at: string;
};

export type Page<T> = { items: T[]; total: number; page: number; size: number };

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// FastAPI 오류는 {"detail": "메시지"} (입력 검증 오류는 detail 이 목록)
function messageOf(body: unknown, status: number) {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return "입력값을 확인해 주세요.";
  if (status === 401) return "로그인이 필요해요.";
  return "요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
}

async function request<T>(
  path: string,
  init: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (rest.body) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "서버에 연결하지 못했어요. 백엔드가 켜져 있는지 확인해 주세요.",
    );
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageOf(body, res.status));
  return body as T;
}

// --- 공개 조회 ---
export function listExperiences(params: {
  q?: string;
  region?: string;
  page?: number;
  size?: number;
}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, String(v));
  return request<Page<Experience>>(`?${qs}`);
}

export function getExperience(id: string) {
  return request<ExperienceDetail>(`/${encodeURIComponent(id)}`);
}

// --- 로그인 필요 ---
export function reserve(
  token: string,
  experienceId: string,
  sessionId: string,
  headcount: number,
) {
  return request<Reservation>(
    `/${encodeURIComponent(experienceId)}/sessions/${sessionId}/reservations`,
    { method: "POST", body: JSON.stringify({ headcount }), token },
  );
}

export function myReservations(token: string) {
  return request<Reservation[]>("/reservations/me", { token });
}

export function cancelReservation(token: string, reservationId: string) {
  return request<Reservation>(`/reservations/${reservationId}/cancel`, {
    method: "POST",
    token,
  });
}

// --- 관리자 ---
export function adminReservations(
  token: string,
  params: { session_id?: string; status?: string; size?: number } = {},
) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, String(v));
  return request<Page<Reservation>>(`/admin/reservations?${qs}`, { token });
}

export function closeSession(token: string, sessionId: string) {
  return request<Session>(`/admin/sessions/${sessionId}/close`, {
    method: "POST",
    token,
  });
}

// --- 개발용 임시 로그인 (백엔드 APP_ENV=local 에서만 존재, 없으면 404) ---
export type DevToken = {
  access_token: string;
  role: "user" | "admin";
  user_id: string;
};

export async function fetchDevToken(
  role: "user" | "admin",
): Promise<DevToken | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/dev/token?role=${role}`, {
      method: "POST",
    });
    return res.ok ? ((await res.json()) as DevToken) : null;
  } catch {
    return null;
  }
}

// --- 토큰 보관 (브라우저 전용) ---
const TOKEN_KEY = "experience.token";
const ROLE_KEY = "experience.role";

export function getToken(): { token: string; role: "user" | "admin" } | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY) === "admin" ? "admin" : "user";
    return token ? { token, role } : null;
  } catch {
    return null;
  }
}

export function saveToken(token: string, role: "user" | "admin") {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLE_KEY, role);
  } catch {
    /* 저장 불가 환경이면 로그인 상태를 유지하지 못할 뿐이에요 */
  }
  window.dispatchEvent(new Event("experience-auth"));
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
  } catch {
    /* 무시 */
  }
  window.dispatchEvent(new Event("experience-auth"));
}

// 회차 시각을 한국 시간으로 보여줘요. 예: 11월 14일(토) 오전 10:00
export function formatSessionTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
