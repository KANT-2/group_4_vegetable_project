import assert from "node:assert/strict";

const base = process.argv[2];
assert.ok(
  base,
  "URL을 지정하세요: node scripts/check-login.mjs http://127.0.0.1:3103",
);
for (const path of ["/cart?tab=wishlist", "/mypage", "/%63art"]) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  assert.equal(response.status, 307);
  const destination = new URL(response.headers.get("location"), base);
  assert.equal(destination.pathname, "/login");
  assert.match(response.headers.get("cache-control"), /no-store/);
}
for (const path of [
  "/auth/callback?next=//evil.example",
  "/auth/callback?code=invalid&next=/cart",
]) {
  const response = await fetch(new URL(path, base), { redirect: "manual" });
  assert.equal(response.status, 307);
  const destination = new URL(response.headers.get("location"), base);
  assert.equal(destination.origin, new URL(base).origin);
  assert.equal(destination.pathname, "/login");
  assert.equal(destination.searchParams.get("error"), "oauth");
  assert.match(response.headers.get("cache-control"), /no-store/);
}
console.log("login: private routes and failed OAuth callbacks passed");
