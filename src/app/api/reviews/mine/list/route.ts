import { reviewProxy } from "@/lib/review-proxy";
export function GET(request: Request) {
  const page = new URL(request.url).searchParams.get("page") ?? "1";
  return reviewProxy(`/mine/list?${new URLSearchParams({ page })}`, {}, true);
}
