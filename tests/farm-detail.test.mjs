import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { routes } from "../src/lib/routes.ts";
import { products } from "../src/data/mock/products.ts";

// 농가 상세 /story/[farm]: 주소의 농가 이름을 다시 풀었을 때 같은 농가를 찾아야 해요.
test("농가 상세 주소는 모든 농가 이름을 그대로 되돌린다", () => {
  const farmNames = [...new Set(products.map((p) => p.farmName))];
  assert.ok(farmNames.length > 0);
  for (const name of farmNames) {
    const href = routes.farm(name);
    assert.match(href, /^\/story\/[^/?#]+$/);
    assert.equal(decodeURIComponent(href.slice("/story/".length)), name);
  }
});

test("농가 상세 지도용 지역 정보가 모든 시연 농가에 있다", () => {
  const missing = products
    .filter((p) => p.isActive && !p.farmRegion)
    .map((p) => p.farmName);
  assert.deepEqual([...new Set(missing)], []);
});

test("농가 상세 페이지 파일이 있다", async () => {
  await access(new URL("../src/app/story/[farm]/page.tsx", import.meta.url));
});
