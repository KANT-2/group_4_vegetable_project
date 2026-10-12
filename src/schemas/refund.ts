import { z } from "zod";

export const refundSchema = z
  .object({
    order_id: z.uuid("주문 번호를 확인해 주세요."),
    reason: z
      .string()
      .trim()
      .min(10, "환불 사유는 10자 이상 입력해 주세요.")
      .max(500, "환불 사유는 500자 이하여야 합니다."),
  })
  .strict();
