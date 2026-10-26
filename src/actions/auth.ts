"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/schemas/auth";
import { safeNextPath } from "@/lib/redirect";
import type { ActionResult } from "@/types/action";
import { googleCallbackUrl } from "@/lib/auth-urls";
import { requireSupabaseConfig } from "@/lib/supabase/config";
import { getGoogleLoginStatus } from "@/services/auth-settings";
import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_COOKIE,
  accessTokenCookieOptions,
} from "@/lib/auth-cookie";
import { fastApi, FastApiError, loginWithPassword } from "@/lib/fastapi";
import { getCustomerDemo, clearCustomerDemo } from "@/lib/customer-demo";

export async function signInWithGoogle(next: string): Promise<ActionResult> {
  let authorizeUrl: string;
  try {
    const status = await getGoogleLoginStatus();
    if (!status.ready) return { ok: false, error: status.message };
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: googleCallbackUrl(
          process.env.NEXT_PUBLIC_SITE_URL,
          typeof next === "string" ? next : undefined,
        ),
        scopes: "openid email profile",
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) throw new Error("oauth unavailable");
    const url = new URL(data.url);
    if (
      url.origin !== new URL(requireSupabaseConfig().url).origin ||
      url.pathname !== "/auth/v1/authorize"
    )
      throw new Error("unexpected oauth destination");
    authorizeUrl = url.toString();
  } catch {
    return {
      ok: false,
      error: "Google 로그인에 연결하지 못했어요. 다시 시도해 주세요.",
    };
  }
  redirect(authorizeUrl);
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  try {
    const token = await loginWithPassword(
      parsed.data.email,
      parsed.data.password,
    );
    const cookieStore = await cookies();
    cookieStore.set(
      ACCESS_TOKEN_COOKIE,
      token.access_token,
      accessTokenCookieOptions(token.expires_in),
    );
  } catch (error) {
    if (error instanceof FastApiError && error.status === 401)
      return {
        ok: false,
        error: "로그인하지 못했습니다. 이메일과 비밀번호를 확인해주세요.",
      };
    return {
      ok: false,
      error: "로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(parsed.data.next));
}

export async function signUp(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  try {
    await fastApi("/api/v1/accounts/register", {
      method: "POST",
      body: JSON.stringify({
        username: parsed.data.username,
        email: parsed.data.email,
        nickname: parsed.data.nickname,
        password: parsed.data.password,
      }),
    });
  } catch (error) {
    if (error instanceof FastApiError && error.status === 409)
      return { ok: false, error: "이미 사용 중인 아이디 또는 이메일입니다." };
    return { ok: false, error: "회원가입 서버에 연결할 수 없습니다." };
  }
  redirect("/login?registered=1");
}

export async function signOut(returnToHome = true): Promise<ActionResult> {
  if (await getCustomerDemo()) {
    await clearCustomerDemo();
    revalidatePath("/", "layout");
    if (returnToHome) redirect("/", "replace");
    return { ok: true };
  }
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  let blacklistFailed = false;
  try {
    if (token)
      await fastApi<void>("/api/v1/accounts/logout", { method: "POST" }, token);
  } catch {
    blacklistFailed = Boolean(token);
  } finally {
    cookieStore.delete(ACCESS_TOKEN_COOKIE);
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // FastAPI 세션 로그아웃과 쿠키 제거 결과를 우선한다.
    }
  }

  if (blacklistFailed) {
    return {
      ok: false,
      error:
        "서버 로그아웃 확인에 실패했지만 이 브라우저의 로그인은 해제했어요.",
    };
  }

  revalidatePath("/", "layout");
  // 프론트에서 별도 Context를 사용한다면 로그아웃할 때 그 상태도 초기화합니다.
  if (returnToHome) redirect("/", "replace");
  return { ok: true };
}
