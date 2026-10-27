import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/redirect";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { fastApi, FastApiError, type FastApiUser } from "@/lib/fastapi";

// React 서버 렌더 요청 안에서만 공유합니다. 계정 정보를 요청 사이에 캐시하지 않습니다.
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) {
    try {
      const user = await fastApi<FastApiUser>("/api/v1/accounts/me", {}, token);
      return {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile: user.profile,
      };
    } catch (error) {
      if (error instanceof FastApiError && error.status === 401) return null;
      throw new Error(
        "로그인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  }
  // Google 인증도 콜백에서 FastAPI JWT를 발급받아 이 쿠키에 저장한다.
  // Supabase 세션만으로는 서비스 계정이 완성됐다고 인정하지 않는다.
  return null;
});

export async function requireUser(next = "/mypage") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath(next))}`);
  return user;
}
