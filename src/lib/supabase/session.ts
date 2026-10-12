import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "@/types/database";
import { isPrivatePath } from "@/lib/auth-urls";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  const privatePath = isPrivatePath(request.nextUrl.pathname);
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  if (!config) {
    if (!privatePath) return response;
    const denied = NextResponse.redirect(loginUrl);
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }

  const supabase = createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });

  await supabase.auth.getClaims();
  if (privatePath) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const denied = NextResponse.redirect(loginUrl);
      response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie));
      denied.headers.set("Cache-Control", "private, no-store");
      return denied;
    }
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}
