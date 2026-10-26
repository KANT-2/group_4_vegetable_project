// 관리자가 올린 상품 사진을 FastAPI(DB)에서 받아 그대로 보여 줘요. 주소의 ?v= 버전이 바뀌면 새 사진이에요.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 100)
    return new Response(null, { status: 404 });
  const base =
    process.env.FASTAPI_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:8000";
  try {
    const response = await fetch(
      `${base.replace(/\/$/, "")}/api/v1/catalog/products/${id}/image`,
      { cache: "no-store", signal: AbortSignal.timeout(20000) },
    );
    if (!response.ok) return new Response(null, { status: response.status });
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
