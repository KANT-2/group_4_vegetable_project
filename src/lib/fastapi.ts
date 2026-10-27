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
    // 재고 부족(409) 응답에만 있는 값: 지금 구매할 수 있는 최대 수량
    public readonly available?: number,
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
  // FormData(사진 업로드)는 fetch 가 경계값을 넣은 multipart 형식을 직접 정해요.
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    let message = "요청을 처리하지 못했습니다.";
    let available: number | undefined;
    try {
      const body = (await response.json()) as {
        detail?: unknown;
        available?: unknown;
      };
      if (typeof body.detail === "string") message = body.detail;
      if (Number.isInteger(body.available))
        available = body.available as number;
    } catch {
      // JSON 오류 응답이 아니면 사용자용 기본 문구를 사용한다.
    }
    throw new FastApiError(response.status, message, available);
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
