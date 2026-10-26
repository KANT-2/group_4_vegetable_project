"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { catalogToken } from "@/lib/catalog-api";
import { fastApi, FastApiError } from "@/lib/fastapi";

const change = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .max(100),
    price: z.number().int().min(1).max(2147483647),
    is_active: z.boolean(),
  })
  .strict();
export async function updateCatalogProduct(input: unknown) {
  const parsed = change.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: "가격과 판매 여부를 확인해 주세요." };
  const token = await catalogToken();
  if (!token)
    return {
      ok: false as const,
      error: "FastAPI 관리자 계정으로 로그인해 주세요.",
    };
  try {
    const { id, ...body } = parsed.data;
    // Backend checks the current account role; local admin cookies confer no API authority.
    await fastApi(
      `/api/v1/catalog/admin/products/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(body) },
      token,
    );
    revalidatePath("/", "layout");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof FastApiError
          ? error.message
          : "저장하지 못했습니다. 다시 시도해 주세요.",
    };
  }
}
