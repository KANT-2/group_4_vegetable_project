import "server-only";

export type FastApiToken = {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
};

export type FastApiAddress = {
  recipient_name: string;
  recipient_phone: string;
  postal_code: string;
  address: string;
  address_detail: string;
};

export type FastApiUser = {
  id: string;
  email: string;
  username: string | null;
  role: "user" | "admin";
  profile: {
    user_id: string;
    nickname: string;
    shipping_address: FastApiAddress | null;
  };
};

export class FastApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function apiUrl(path: string) {
  const base =
    process.env.FASTAPI_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000";
  return `${base.replace(/\/$/, "")}${path}`;
}

export async function fastApi<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    let message = "요청을 처리하지 못했습니다.";
    try {
      const body = (await response.json()) as { detail?: unknown };
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // JSON 오류 응답이 아니면 사용자용 기본 문구를 사용한다.
    }
    throw new FastApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function loginWithPassword(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password });
  return fastApi<FastApiToken>("/api/v1/accounts/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}
