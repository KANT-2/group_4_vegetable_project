import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";
import type { Database } from "@/types/database";
import { isPrivatePath } from "@/lib/auth-urls";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import {
  customerDemoCookie,
  decodeCustomerDemo,
} from "@/lib/customer-demo-session";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // 임시 세션은 마이페이지 화면에만 허용하며 주문/장바구니 인증을 대체하지 않습니다.
  if (
    (request.nextUrl.pathname === "/mypage" ||
      request.nextUrl.pathname === "/mypage/orders" ||
      request.nextUrl.pathname === "/mypage/reviews" ||
      request.nextUrl.pathname === "/cart") &&
    decodeCustomerDemo(request.cookies.get(customerDemoCookie)?.value)
  ) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
  const config = getSupabaseConfig();
  const privatePath = isPrivatePath(request.nextUrl.pathname);
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  // FastAPI JWT의 실제 검증은 보호된 페이지의 requireUser에서 수행한다.
  // 미들웨어에서는 HttpOnly 쿠키 존재 여부만 확인해 Supabase 전용 리디렉션을 건너뛴다.
  if (privatePath && request.cookies.has(ACCESS_TOKEN_COOKIE)) {
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
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
