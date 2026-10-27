import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin, loginNext } from "@/lib/auth-urls";
import { fastApi, type FastApiToken, type FastApiUser } from "@/lib/fastapi";
import { ACCESS_TOKEN_COOKIE, accessTokenCookieOptions } from "@/lib/auth-cookie";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = loginNext(requestUrl.searchParams.get("next") ?? undefined);
  let origin: string;
  try {
    origin = getSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  } catch {
    return NextResponse.json(
      { error: "로그인 연결 설정을 확인해주세요." },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const adminLogin = next === "/admin" || next.startsWith("/admin/");
  const failure = new URL(adminLogin ? "/admin/login" : "/login", origin);
  failure.searchParams.set("error", "oauth");
  failure.searchParams.set("next", next);
  let stage = "request-validation";
  try {
    if (request.headers.get("host") !== new URL(origin).host)
      throw new Error("wrong callback host");
    const code = requestUrl.searchParams.get("code");
    if (!code || requestUrl.searchParams.has("error"))
      throw new Error("missing code");
    stage = "code-exchange";
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session?.access_token)
      throw new Error("code exchange failed");
    stage = "fastapi-login";
    const token = await fastApi<FastApiToken>("/api/v1/accounts/google-login", {
      method: "POST",
      body: JSON.stringify({ access_token: data.session.access_token }),
    });
    const success = NextResponse.redirect(new URL(next, origin), {
      headers: { "Cache-Control": "private, no-store" },
    });
    success.cookies.set(
      ACCESS_TOKEN_COOKIE,
      token.access_token,
      accessTokenCookieOptions(token.expires_in),
    );
    stage = "profile-check";
    try {
      // 응답 쿠키는 다음 브라우저 요청부터 보인다. 방금 발급받은 JWT로
      // 직접 확인해야 새 Google 로그인을 기존 쿠키 부재로 오판하지 않는다.
      await fastApi<FastApiUser>("/api/v1/accounts/me", {}, token.access_token);
    } catch {
      await supabase.auth.signOut();
      throw new Error("profile setup failed");
    }
    return success;
  } catch (error) {
    console.error("[auth/callback] Google login failed", {
      stage,
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.redirect(failure, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
