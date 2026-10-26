import assert from "node:assert/strict";
import test from "node:test";
import { safeNextPath } from "../src/lib/redirect.ts";
import { signInSchema, signUpSchema } from "../src/schemas/auth.ts";
import { profileSchema } from "../src/schemas/profile.ts";
import { shippingSchema } from "../src/schemas/shipping.ts";
import { refundSchema } from "../src/schemas/refund.ts";

test("로그인 후 이동은 내부 경로만 허용한다", () => {
  assert.equal(safeNextPath("/cart?tab=wishlist"), "/cart?tab=wishlist");
  for (const path of [
    undefined,
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/%2fevil.example",
    "/%5cevil.example",
    "/%0aevil",
    "/%",
    "javascript:alert(1)",
  ]) {
    assert.equal(safeNextPath(path), "/mypage");
  }
});

test("로그인 입력을 검증하고 비밀번호 공백은 보존한다", () => {
  const input = { email: " member@example.com ", password: " password " };
  assert.deepEqual(signInSchema.parse(input), {
    email: "member@example.com",
    password: " password ",
  });
  assert.equal(
    signInSchema.safeParse({ email: "invalid", password: "" }).success,
    false,
  );
  assert.equal(
    signInSchema.safeParse({ email: "member_id", password: "password" })
      .success,
    true,
  );
  assert.equal(
    signInSchema.safeParse({ ...input, password: "a".repeat(1025) }).success,
    false,
  );
});

test("일반 회원가입은 아이디·이메일·닉네임과 비밀번호 확인을 검증한다", () => {
  const valid = {
    username: "new_user",
    email: "new@example.test",
    nickname: "새싹회원",
    password: "test1234!",
    confirmPassword: "test1234!",
  };
  assert.equal(signUpSchema.safeParse(valid).success, true);
  assert.equal(
    signUpSchema.safeParse({ ...valid, confirmPassword: "different" }).success,
    false,
  );
  assert.equal(signUpSchema.safeParse({ ...valid, username: "한글" }).success, false);
});

test("프로필은 닉네임만 변경하고 길이를 검증한다", () => {
  assert.deepEqual(profileSchema.parse({ nickname: " 새싹 " }), {
    nickname: "새싹",
  });
  for (const input of [
    { nickname: " " },
    { nickname: "가" },
    { nickname: "가".repeat(21) },
    { nickname: "새싹", id: "other-user" },
    { nickname: "새싹", role: "admin" },
  ]) {
    assert.equal(profileSchema.safeParse(input).success, false);
  }
});

test("배송지는 필수값·우편번호·연락처를 검증하고 ID 주입을 거부한다", () => {
  const valid = {
    recipient_name: " 가상회원 ",
    recipient_phone: "010-1234-5678",
    postal_code: "01234",
    address: " 가상 테스트 주소 ",
    address_detail: "",
  };
  const parsed = shippingSchema.parse(valid);
  assert.equal(parsed.recipient_phone, "01012345678");
  assert.equal(parsed.address, "가상 테스트 주소");
  for (const invalid of [
    { ...valid, id: "other-user" },
    { ...valid, recipient_name: " " },
    { ...valid, postal_code: "1234" },
    { ...valid, postal_code: "ABCDE" },
    { ...valid, recipient_phone: "phone" },
    { ...valid, address: " " },
    { ...valid, address_detail: "가".repeat(101) },
  ])
    assert.equal(shippingSchema.safeParse(invalid).success, false);
});

test("환불 사유 길이·주문 번호와 승인 상태 주입을 검증한다", () => {
  const input = {
    order_id: "00000000-0000-4000-8000-000000000011",
    reason: "  테스트 주문의 환불을 신청합니다.  ",
  };
  assert.equal(refundSchema.parse(input).reason, input.reason.trim());
  for (const invalid of [
    { ...input, order_id: "invalid" },
    { ...input, reason: "짧음" },
    { ...input, reason: "가".repeat(501) },
    { ...input, status: "approved" },
    { ...input, user_id: "other-user" },
    { ...input, reason: " ".repeat(20) },
  ])
    assert.equal(refundSchema.safeParse(invalid).success, false);
});
