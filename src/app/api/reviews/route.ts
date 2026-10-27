import {
  reviewForm,
  reviewOriginAllowed,
  reviewProxy,
} from "@/lib/review-proxy";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";

export function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["product_id", "sort", "kind", "page"])
    if (input.has(key)) query.set(key, input.get(key)!);
  return reviewProxy(`?${query}`);
}

export async function POST(request: Request) {
  if (!reviewOriginAllowed(request))
    return Response.json({ detail: "잘못된 요청입니다." }, { status: 403 });
  if (!(await cookies()).get(ACCESS_TOKEN_COOKIE)?.value)
    return Response.json(
      { detail: "로그인 후 리뷰를 작성해 주세요." },
      { status: 401 },
    );
  try {
    const form = await reviewForm(request);
    if (form.getAll("images").length > 3)
      return Response.json(
        { detail: "사진은 최대 3장까지 첨부할 수 있어요." },
        { status: 422 },
      );
    for (const [key, value] of form.entries()) {
      if (!["product_id", "content", "rating", "images"].includes(key))
        return Response.json(
          { detail: "허용되지 않는 입력입니다." },
          { status: 422 },
        );
      if (
        value instanceof File &&
        (key !== "images" || value.size > 5 * 1024 * 1024)
      )
        return Response.json(
          { detail: "사진은 한 장당 5MB 이하로 첨부해 주세요." },
          { status: 422 },
        );
    }
    return reviewProxy("", { method: "POST", body: form }, true);
  } catch {
    return Response.json(
      {
        detail:
          "첨부 파일 용량이나 형식을 확인해 주세요. 사진은 최대 3장, 각 5MB까지 가능해요.",
      },
      { status: 413 },
    );
  }
}
