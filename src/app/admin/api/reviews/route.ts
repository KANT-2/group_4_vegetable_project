import { reviewOriginAllowed, reviewProxy } from "@/lib/review-proxy";
export function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["q", "status", "page"])
    if (input.has(key)) query.set(key, input.get(key)!);
  return reviewProxy(`/admin?${query}`, {}, true);
}
export async function POST(request: Request) {
  if (!reviewOriginAllowed(request))
    return Response.json({ detail: "잘못된 요청입니다." }, { status: 403 });
  try {
    const body = await request.json();
    if (typeof body.id !== "string" || !/^[\da-f-]{36}$/i.test(body.id))
      return Response.json(
        { detail: "리뷰를 확인해 주세요." },
        { status: 422 },
      );
    if (body.action === "restore")
      return reviewProxy(`/admin/${body.id}/restore`, { method: "POST" }, true);
    if (
      body.action !== "delete" ||
      typeof body.reason !== "string" ||
      body.reason.length > 200
    )
      return Response.json(
        { detail: "삭제 사유를 확인해 주세요." },
        { status: 422 },
      );
    return reviewProxy(
      `/admin/${body.id}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: body.reason }),
      },
      true,
    );
  } catch {
    return Response.json({ detail: "요청을 확인해 주세요." }, { status: 422 });
  }
}
