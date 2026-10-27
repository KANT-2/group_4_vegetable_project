import { reviewProxy } from "@/lib/review-proxy";

export function GET(request: Request) {
  const product = new URL(request.url).searchParams.get("product_id") ?? "";
  return reviewProxy(
    `/eligibility?${new URLSearchParams({ product_id: product })}`,
    {},
    true,
  );
}
