import { safeNextPath } from "./redirect.ts";

export function getSiteOrigin(value: string | undefined): string {
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL이 필요합니다.");
  const url = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "사이트 URL은 HTTPS origin 또는 로컬 HTTP origin이어야 합니다.",
    );
  }
  return url.origin;
}

export function loginNext(value: string | undefined): string {
  const path = safeNextPath(value ?? "/");
  const pathname = decodeURIComponent(
    new URL(path, "https://internal.invalid").pathname,
  );
  return pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/auth" ||
    pathname.startsWith("/auth/")
    ? "/"
    : path;
}

export function googleCallbackUrl(
  siteUrl: string | undefined,
  next: string | undefined,
): string {
  const url = new URL("/auth/callback", getSiteOrigin(siteUrl));
  url.searchParams.set("next", loginNext(next));
  return url.toString();
}

export function isPrivatePath(pathname: string): boolean {
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  // 장바구니(/cart)는 비회원도 쓸 수 있고, 찜·쿠폰 탭은 화면에서 로그인을 확인해요.
  return ["/cart/checkout", "/mypage"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
