import assert from "node:assert/strict";

const base = process.argv[2];
assert.ok(
  base,
  "실행 중인 앱 URL을 지정하세요: node scripts/check-navigation.mjs http://localhost:3102",
);
for (const path of [
  "/api/navigation",
  "/api/navigation?user_id=00000000-0000-4000-8000-000000000001",
]) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /no-store/);
  assert.match(response.headers.get("cache-control"), /private/);
  assert.match(response.headers.get("vary"), /Cookie/i);
  assert.deepEqual(await response.json(), { user: null, cartCount: 0 });
}
console.log(
  "navigation: guest response, ignored user_id and private cache passed",
);
