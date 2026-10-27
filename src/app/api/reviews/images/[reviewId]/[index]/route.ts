import { reviewProxy } from "@/lib/review-proxy";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reviewId: string; index: string }> },
) {
  const { reviewId, index } = await params;
  if (!/^[\da-f-]{36}$/i.test(reviewId) || !/^[0-2]$/.test(index))
    return new Response(null, { status: 404 });
  return reviewProxy(`/${reviewId}/images/${index}`);
}
