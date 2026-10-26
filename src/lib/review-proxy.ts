import "server-only";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";

const MAX_BODY = 16 * 1024 * 1024;
export function reviewOriginAllowed(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function reviewProxy(
  path: string,
  init: RequestInit = {},
  auth = false,
) {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (auth && !token)
    return Response.json({ detail: "로그인이 필요합니다." }, { status: 401 });
  const headers = new Headers(init.headers);
  if (token && auth) headers.set("Authorization", `Bearer ${token}`);
  try {
    const base =
      process.env.FASTAPI_URL ??
      process.env.NEXT_PUBLIC_API_BASE_URL ??
      "http://127.0.0.1:8000";
    const response = await fetch(
      `${base.replace(/\/$/, "")}/api/v1/catalog/reviews${path}`,
      {
        ...init,
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (response.status === 204) return new Response(null, { status: 204 });
    if (response.headers.get("content-type")?.startsWith("image/")) {
      return new Response(await response.arrayBuffer(), {
        status: response.status,
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    const body = await response.json();
    return Response.json(body, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { detail: "리뷰 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}

export async function reviewForm(request: Request): Promise<FormData> {
  if (Number(request.headers.get("content-length")) > MAX_BODY)
    throw new Error("size");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new Error("size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("content-type") ?? "" },
    body: Buffer.concat(chunks),
  }).formData();
}
