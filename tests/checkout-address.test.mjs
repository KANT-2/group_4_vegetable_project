import assert from "node:assert/strict";
import test from "node:test";
import { checkoutShippingSchema } from "../src/schemas/shipping.ts";

const base = {
  recipient_name: "홍길동",
  recipient_phone: "01012345678",
  postal_code: "06236",
  address: "서울 강남구 테헤란로 1",
  address_detail: "101동 202호",
};
const parse = (overrides) =>
  checkoutShippingSchema.safeParse({ ...base, ...overrides });

test("주문 배송지: 실제 주소처럼 보이는 입력은 통과한다", () => {
  assert.equal(parse({}).success, true);
  for (const [postal_code, address, address_detail] of [
    ["13529", "경기 성남시 분당구 판교역로 235", "에이치스퀘어 N동 5층"],
    ["48058", "부산 해운대구 해운대해변로 264", "202"],
    ["06236", "123 Main Street Seoul", "Apt 4B"],
    ["12345", "서울 강남구 테헤란로 1", "1호"],
  ])
    assert.equal(
      parse({ postal_code, address, address_detail }).success,
      true,
      `${postal_code} ${address}`,
    );
});

test("주문 배송지: 같은 숫자 반복·범위 밖 우편번호는 거부한다", () => {
  for (const postal_code of ["11111", "00000", "99999", "00999", "64000"]) {
    const result = parse({ postal_code });
    assert.equal(result.success, false, postal_code);
    assert.match(result.error.issues[0].message, /우편번호/);
  }
});

test("주문 배송지: 숫자만 있거나 한 글자 반복인 기본 주소는 거부한다", () => {
  for (const address of [
    "1111111111111111",
    "12345 67890",
    "!!!!!!!!",
    "aaaaaaaa",
    "ㅋㅋㅋㅋㅋㅋ",
  ]) {
    const result = parse({ address });
    assert.equal(result.success, false, address);
    assert.match(result.error.issues[0].message, /기본 주소/);
  }
});

test("주문 배송지: 같은 글자 반복인 상세주소는 거부한다", () => {
  for (const address_detail of ["1111", "11 11", "ㅋㅋㅋㅋ", "aaaa", "!!!"]) {
    const result = parse({ address_detail });
    assert.equal(result.success, false, address_detail);
    assert.match(result.error.issues[0].message, /상세주소/);
  }
});

test("주문 배송지: 화면에서 본 것과 같이 11111 / 숫자만 주소 / 숫자만 상세주소는 모두 막는다", () => {
  const result = parse({
    postal_code: "11111",
    address: "1111111111111111",
    address_detail: "11111111111111111111",
  });
  assert.equal(result.success, false);
  assert.equal(result.error.issues.length, 3);
});
