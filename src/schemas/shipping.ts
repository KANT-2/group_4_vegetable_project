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
