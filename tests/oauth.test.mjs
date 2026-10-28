import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  getSiteOrigin,
  googleCallbackUrl,
  loginNext,
  isPrivatePath,
} from "../src/lib/auth-urls.ts";

test("OAuth callback은 설정한 origin과 내부 복귀 경로만 사용한다", () => {
  assert.equal(getSiteOrigin("http://127.0.0.1:3103"), "http://127.0.0.1:3103");
  assert.equal(getSiteOrigin("https://shop.example"), "https://shop.example");
  for (const origin of [
    undefined,
    "http://shop.example",
    "https://name:secret@shop.example",
    "https://shop.example/path",
    "https://shop.example?q=1",
    "javascript:alert(1)",
  ])
    assert.throws(() => getSiteOrigin(origin));
  const callback = new URL(
    googleCallbackUrl("https://shop.example", "/cart?tab=wishlist"),
  );
  assert.equal(callback.origin, "https://shop.example");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("next"), "/cart?tab=wishlist");
  assert.equal(
    new URL(
      googleCallbackUrl("https://shop.example", "//evil.example"),
    ).searchParams.get("next"),
    "/mypage",
  );
});

test("인증 경로로 되돌아가는 로그인 루프를 차단한다", () => {
  assert.equal(loginNext(undefined), "/");
  for (const path of [
    "/login",
    "/login?next=/login",
    "/auth/callback",
    "/auth/google",
    "/%61uth/callback",
  ])
    assert.equal(loginNext(path), "/");
});

test("개인 경로는 하위 경로까지 보호하고 공개 경로는 유지한다", () => {
  for (const path of [
    "/cart/checkout",
    "/cart/checkout/done",
    "/mypage",
    "/mypage/profile",
    "/%63art/checkout",
    "/%6dypage/profile",
  ])
    assert.equal(isPrivatePath(path), true);
  for (const path of [
    "/",
    "/login",
    "/auth/callback",
    "/recipes",
    "/cart", // 비회원 장바구니
    "/cart/items",
    "/%63art",
    "/cart/checkouts",
    "/cartoon",
    "/mypages",
  ])
    assert.equal(isPrivatePath(path), false);
});

test("로그인된 사용자는 이전 OAuth 오류 표시가 남아 있어도 로그인 폼을 보지 않는다", () => {
  const loginPage = readFileSync(
    new URL("../src/app/login/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(loginPage, /if \(user\) redirect\(next\)/);
  assert.doesNotMatch(loginPage, /user\s*&&\s*!params\.error/);
});

test("OAuth 연동 실패는 Supabase 세션을 정리하고 단독 세션 우회를 허용하지 않는다", () => {
  const callback = readFileSync(
    new URL("../src/app/auth/callback/route.ts", import.meta.url),
    "utf8",
  );
  const auth = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  const profile = readFileSync(
    new URL("../src/services/profile.ts", import.meta.url),
    "utf8",
  );

  assert.match(callback, /catch \(error\)[\s\S]*supabase\.auth\.signOut\(\)/);
  assert.doesNotMatch(auth, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(profile, /from\("profiles"\)/);
  assert.doesNotMatch(profile, /새싹회원/);
});
