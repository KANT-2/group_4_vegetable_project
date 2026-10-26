"use server";
import { revalidatePath } from "next/cache";
import { catalogToken } from "@/lib/catalog-api";
import { fastApi, FastApiError } from "@/lib/fastapi";
import { wishlistSchema } from "@/schemas/cart";

export async function changeCatalogWish(input: unknown) {
  const parsed = wishlistSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0].message };
  const token = await catalogToken();
  if (!token)
    return {
      ok: false as const,
      error: "다시 로그인해 주세요.",
      needsLogin: true,
    };
  const { product_id, wished } = parsed.data;
  try {
    await fastApi(
      `/api/v1/catalog/wishlist/${encodeURIComponent(product_id)}`,
      { method: wished ? "PUT" : "DELETE" },
      token,
    );
    revalidatePath("/cart");
    revalidatePath(`/products/${product_id}`);
    return { ok: true as const };
  } catch (error) {
    // An already removed wish has the desired final state.
    if (!wished && error instanceof FastApiError && error.status === 404)
      return { ok: true as const };
    return {
      ok: false as const,
      error:
        error instanceof FastApiError
          ? error.message
          : "찜을 저장하지 못했습니다.",
      needsLogin: error instanceof FastApiError && error.status === 401,
    };
  }
}
