import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { getCustomerDemo } from "@/lib/customer-demo";

// 장바구니·주문을 어디에 저장할지 요청마다 정해요.
// - demo     개발용 데모 계정(로컬 파일). 주문·결제는 막혀 있어요.
// - fastapi  FastAPI 로그인(HttpOnly 토큰 쿠키): 장바구니·주문을 FastAPI 로 처리해요.
// - supabase 예전 Supabase 로그인: 기존 방식 그대로예요.
// - guest    로그인하지 않음: 브라우저 쿠키에만 장바구니를 두고, 주문·결제는 로그인이 필요해요.
export type CartMode =
  | { kind: "demo" }
  | { kind: "fastapi"; token: string; userId: string }
  | { kind: "supabase"; userId: string }
  | { kind: "guest" };

export async function getCartMode(): Promise<CartMode> {
  if (await getCustomerDemo()) return { kind: "demo" };
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  // getCurrentUser 는 토큰 쿠키가 있으면 FastAPI 로, 없으면 Supabase 로 확인해요. 만료·로그아웃된 토큰은 null 이에요.
  const user = await getCurrentUser();
  if (!user) return { kind: "guest" };
  return token
    ? { kind: "fastapi", token, userId: user.id }
    : { kind: "supabase", userId: user.id };
}
