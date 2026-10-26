import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { safeNextPath } from "@/lib/redirect";

export type ExperienceAuth = {
  token: string;
  userId: string;
  role: "user" | "admin";
};

// 쿠키의 토큰(지나의 FastAPI 로그인)에서 사용자 ID·권한을 읽어 화면을 구성하는 데만 써요.
// 서명은 여기서 검증하지 않아요. 진짜 인증·권한·로그아웃(블랙리스트) 검사는 FastAPI 가 모든 요청에서 해서,
// 위조·만료·로그아웃된 토큰은 API 에서 401/403 으로 막혀요. (그때 화면은 로그인 화면으로 보내요.)
// /accounts/me 는 프로필 행이 있어야 응답해서(프로필 FK 통합 전에는 404) 권한 확인에 쓰지 않아요.
function readClaims(
  token: string,
): { sub: string; role: string; exp: number } | null {
  try {
    const part = token.split(".")[1];
    const json = Buffer.from(part, "base64url").toString("utf-8");
    const claims = JSON.parse(json) as {
      sub?: unknown;
      role?: unknown;
      exp?: unknown;
    };
    if (
      typeof claims.sub !== "string" ||
      typeof claims.role !== "string" ||
      typeof claims.exp !== "number"
    )
      return null;
    return { sub: claims.sub, role: claims.role, exp: claims.exp };
  } catch {
    return null;
  }
}

export const getExperienceAuth = cache(
  async (): Promise<ExperienceAuth | null> => {
    const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) return null;
    const claims = readClaims(token);
    if (!claims || claims.exp * 1000 <= Date.now()) return null;
    if (claims.role !== "user" && claims.role !== "admin") return null;
    return { token, userId: claims.sub, role: claims.role };
  },
);

export function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}

export async function requireExperienceAuth(next: string) {
  const auth = await getExperienceAuth();
  if (!auth) redirect(loginPath(next));
  return auth;
}
