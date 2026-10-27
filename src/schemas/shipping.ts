import { z } from "zod";

export const shippingSchema = z
  .object({
    recipient_name: z
      .string()
      .trim()
      .min(2, "받는 분 이름은 2자 이상 입력해 주세요.")
      .max(40, "받는 분 이름은 40자 이하여야 합니다."),
    recipient_phone: z
      .string()
      .trim()
      .transform((value) => value.replace(/[- ]/g, ""))
      .pipe(
        z
          .string()
          .regex(/^0\d{8,10}$/, "연락처를 확인해 주세요. 예: 01012345678"),
      ),
    postal_code: z
      .string()
      .trim()
      .regex(/^\d{5}$/, "우편번호는 숫자 5자리로 입력해 주세요."),
    address: z
      .string()
      .trim()
      .min(5, "기본 주소는 5자 이상 입력해 주세요.")
      .max(200, "기본 주소는 200자 이하여야 합니다."),
    address_detail: z
      .string()
      .trim()
      .max(100, "상세주소는 100자 이하여야 합니다."),
  })
  .strict();

export type ShippingAddress = z.infer<typeof shippingSchema>;

// 주문 배송지는 실제 주소처럼 보이는지도 확인해요. 서버(주문 도메인)와 같은 규칙이에요.
// 우편번호: 01000~63999, 같은 숫자 반복(11111·00000) 거부. 12345 같은 연속 숫자는 실제 번호일 수 있어 막지 않아요.
export function isPlausiblePostalCode(postal: string) {
  const value = Number(postal);
  if (value < 1000 || value > 63999) return false;
  return new Set(postal).size > 1;
}

// 기본 주소: 한글 2자 이상 또는 영문 3자 이상, 같은 글자만 반복한 것은 거부
export function isPlausibleAddress(address: string) {
  const hangul = (address.match(/[가-힣]/g) ?? []).length;
  const latin = (address.match(/[A-Za-z]/g) ?? []).length;
  if (hangul < 2 && latin < 3) return false;
  return new Set(address.replace(/\s/g, "")).size > 2;
}

// 상세주소: 글자나 숫자가 있어야 하고, 같은 글자 4번 이상 반복(1111)은 거부
export function isPlausibleDetail(detail: string) {
  if (!/[0-9A-Za-z가-힣]/.test(detail)) return false;
  return !/(.)\1{3,}/.test(detail.replace(/\s/g, ""));
}

export const checkoutShippingSchema = shippingSchema.extend({
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, "우편번호는 숫자 5자리로 입력해 주세요.")
    .refine(
      isPlausiblePostalCode,
      "우편번호를 확인해 주세요. 실제 우편번호 5자리를 입력해 주세요.",
    ),
  address: z
    .string()
    .trim()
    .min(5, "기본 주소는 5자 이상 입력해 주세요.")
    .max(200, "기본 주소는 200자 이하여야 합니다.")
    .refine(
      isPlausibleAddress,
      "기본 주소를 확인해 주세요. 도로명 또는 지번 주소를 글자로 입력해 주세요.",
    ),
  address_detail: z
    .string()
    .trim()
    .min(1, "상세주소를 입력해 주세요.")
    .max(100, "상세주소는 100자 이하여야 합니다.")
    .refine(
      isPlausibleDetail,
      "상세주소를 확인해 주세요. 동·호수 등을 입력해 주세요.",
    ),
});
