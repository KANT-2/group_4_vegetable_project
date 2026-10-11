// 메인·농가 이야기가 DB(products)에서 읽는 값의 검증 (A 담당, Supabase 모드에서만 사용)

import { z } from "zod";

export const showcaseProductRowSchema = z.object({
  id: z.string(),
  vegetable_id: z.string(),
  name: z.string(),
  price: z.number(),
  original_price: z.number(),
  unit: z.string(),
  ugly_reason: z.enum(["small", "bent", "scratched", "irregular"]),
  image_path: z.string().nullable(),
  farm_name: z.string(),
  farm_region: z.string().nullable(),
  farm_story: z.string().nullable(),
  vegetables: z.object({ name: z.string() }).nullable(),
});

export type ShowcaseProductRow = z.infer<typeof showcaseProductRowSchema>;
