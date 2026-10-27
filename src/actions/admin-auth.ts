"use server";

import { redirect } from "next/navigation";
import { clearAdminSession } from "@/lib/admin-auth";
import { clearCustomerDemo } from "@/lib/customer-demo";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from "@/lib/auth-cookie";
import {
  fastApi,
  FastApiError,
  type FastApiUser,
  loginWithPassword,
} from "@/lib/fastapi";

export async function adminSignIn(
  _previous: { error: string },
  form: FormData,
) {
  const id = form.get("id");
  const password = form.get("password");
  if (
    typeof id !== "string" ||
    typeof password !== "string" ||
    id.length > 100 ||
    password.length > 200 ||
    !id.trim() ||
    !password
  )
    return { error: "아이디 또는 비밀번호를 확인해 주세요." };
  try {
    const token = await loginWithPassword(id.trim().toLowerCase(), password);
    const me = await fastApi<FastApiUser>(
      "/api/v1/accounts/me",
      {},
      token.access_token,
    );
    if (me.role !== "admin")
      return { error: "관리자 권한이 있는 계정만 로그인할 수 있습니다." };
    (await cookies()).set(
      ACCESS_TOKEN_COOKIE,
      token.access_token,
      accessTokenCookieOptions(token.expires_in),
    );
    await clearCustomerDemo();
  } catch (error) {
    if (error instanceof FastApiError && error.status === 401)
      return { error: "아이디·이메일 또는 비밀번호를 확인해 주세요." };
    return {
      error: "로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  redirect("/admin");
}

export async function adminSignOut() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) {
    try {
      await fastApi<void>("/api/v1/accounts/logout", { method: "POST" }, token);
    } catch {
      // 브라우저 쿠키 제거를 우선하고, 만료 토큰도 로컬에서 정리한다.
    }
  }
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  await clearAdminSession();
  redirect("/admin/login");
}
