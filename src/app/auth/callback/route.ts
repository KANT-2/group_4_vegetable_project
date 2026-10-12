import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteOrigin, loginNext } from "@/lib/auth-urls";
import { getProfile } from "@/services/profile";

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
  const failure = new URL("/login", origin);
  failure.searchParams.set("error", "oauth");
  failure.searchParams.set("next", next);
  try {
    if (request.headers.get("host") !== new URL(origin).host)
      throw new Error("wrong callback host");
    const code = requestUrl.searchParams.get("code");
    if (!code || requestUrl.searchParams.has("error"))
      throw new Error("missing code");
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error("code exchange failed");
    try {
      await getProfile();
    } catch {
      await supabase.auth.signOut();
      throw new Error("profile setup failed");
    }
    return NextResponse.redirect(new URL(next, origin), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.redirect(failure, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}
