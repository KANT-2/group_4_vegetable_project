import { z } from "zod";

// 장바구니·찜 입력 검사. DB CHECK(수량 1~99)와 상품 ID 형식에 맞춰요.
export const MAX_CART_QUANTITY = 99;

export const productIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "상품 정보를 확인해 주세요.");

export const cartQuantitySchema = z
  .number("수량을 확인해 주세요.")
  .int("수량은 정수로 입력해 주세요.")
  .min(1, "수량은 1개 이상이어야 해요.")
  .max(MAX_CART_QUANTITY, `수량은 ${MAX_CART_QUANTITY}개까지 담을 수 있어요.`);

export const cartItemSchema = z
  .object({ product_id: productIdSchema, quantity: cartQuantitySchema })
  .strict();

export const cartRemoveSchema = z
  .object({ product_id: productIdSchema })
  .strict();

export const wishlistSchema = z
  .object({ product_id: productIdSchema, wished: z.boolean() })
  .strict();
