import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { fastApi } from "@/lib/fastapi";
import { reviewOriginAllowed } from "@/lib/review-proxy";
import { recipeIdSchema } from "@/schemas/recipe";
import { getRecipe } from "@/services/recipes";

const COOKIE = "motnani_recipe_visitor";
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!reviewOriginAllowed(request)) return new Response(null, { status: 403 });
  const raw = await request.text();
  if (raw.length > 256) return new Response(null, { status: 413 });
  let id: string;
  try {
    id = recipeIdSchema.parse(JSON.parse(raw).recipeId);
  } catch {
    return new Response(null, { status: 422 });
  }
  try {
    // 목록의 프리패치나 임의 ID 요청은 집계하지 않아요.
    if (!(await getRecipe(id))) return new Response(null, { status: 404 });
    const jar = await cookies();
    const previous = jar.get(COOKIE)?.value;
    const visitor = previous && UUID.test(previous) ? previous : randomUUID();
    const result = await fastApi<{ counted: boolean }>(
      "/api/v1/catalog/recipe-views",
      {
        method: "POST",
        body: JSON.stringify({ recipe_id: id, visitor_id: visitor }),
      },
    );
    jar.set(COOKIE, visitor, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // 집계 장애가 레시피 상세 이용을 막지 않아요.
    return new Response(null, { status: 503 });
  }
}
