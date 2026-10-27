import { fastApi } from "@/lib/fastapi";
import { isFastApiCatalog } from "@/lib/catalog-mode";

export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!isFastApiCatalog())
    return Response.json({ version: "mock" }, { headers });
  try {
    const version = await fastApi<string>("/api/v1/catalog/version");
    return Response.json({ version }, { headers });
  } catch {
    return Response.json(
      { error: "상품 변경 확인에 실패했습니다." },
      { status: 503, headers },
    );
  }
}
