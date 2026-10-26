import test from "node:test";
import assert from "node:assert/strict";
import {
  farmMapUrls,
  parseFarmLocation,
  validGoogleEmbed,
} from "../src/lib/farm-location.ts";

test("상세 주소가 필요하며 좌표는 두 값과 유효한 범위를 검사한다", () => {
  assert.equal(parseFarmLocation("", "", "", "").ok, false);
  assert.equal(parseFarmLocation("테스트 도로 10", "34.5", "", "").ok, false);
  assert.equal(parseFarmLocation("테스트 도로 10", "91", "126", "").ok, false);
  assert.equal(parseFarmLocation("테스트 도로 10", "34", "181", "").ok, false);
  assert.equal(parseFarmLocation("테스트 도로 10", "abc", "126", "").ok, false);
  assert.equal(parseFarmLocation("테스트 도로 10", "0", "0", "").ok, true);
  assert.equal(parseFarmLocation("테스트 도로 10", "", "", "").ok, true);
});
test("주소와 좌표는 Google 지도 검색 인수로 안전하게 인코딩한다", () => {
  const address = "테스트 도로 10 & <농가>";
  const urls = farmMapUrls({ address });
  assert.equal(new URL(urls.embed).searchParams.get("q"), address);
  assert.equal(new URL(urls.link).searchParams.get("query"), address);
  const precise = farmMapUrls({ address, latitude: 34.5, longitude: 126.5 });
  assert.equal(new URL(precise.embed).searchParams.get("q"), "34.5,126.5");
});
test("지도 퍼가기 주소는 Google HTTPS iframe 주소만 허용한다", () => {
  const embed = "https://www.google.com/maps/embed?pb=example";
  assert.equal(validGoogleEmbed(embed), true);
  assert.equal(
    farmMapUrls({ address: "테스트 도로", mapEmbedUrl: embed }).embed,
    embed,
  );
  for (const bad of [
    "javascript:alert(1)",
    "https://evil.example/maps/embed",
    "https://www.google.com.evil.example/maps/embed",
    "https://www.google.com/maps/search?q=test",
    "http://www.google.com/maps/embed",
    '<iframe src="https://www.google.com/maps/embed"></iframe>',
  ])
    assert.equal(validGoogleEmbed(bad), false);
});
