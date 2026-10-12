import assert from "node:assert/strict";
import test from "node:test";
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
    "/cart",
    "/cart/items",
    "/mypage",
    "/mypage/profile",
    "/%63art",
    "/%6dypage/profile",
  ])
    assert.equal(isPrivatePath(path), true);
  for (const path of [
    "/",
    "/login",
    "/auth/callback",
    "/recipes",
    "/cartoon",
    "/mypages",
  ])
    assert.equal(isPrivatePath(path), false);
});
