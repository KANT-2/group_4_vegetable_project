import { z } from "zod";

// 채소 분류: DB CHECK와 같은 6개 값
export const vegetableCategorySchema = z.enum([
  "root",
  "leaf",
  "fruit_veg",
  "mushroom",
  "fruit",
  "seasoning",
]);
