import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAccess } from "@/lib/admin-auth";
import {
  readContent,
  mutateContent,
  hiddenContent,
} from "@/lib/managed-content";
import type { AdminAction } from "@/lib/admin-store";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  const data = readContent();
  if (new URL(request.url).searchParams.has("version"))
    return NextResponse.json({ revision: data.revision }, { headers });
  if (new URL(request.url).searchParams.has("admin")) {
    if (!(await getAdminAccess()).allowed)
      return NextResponse.json(
        { error: "관리자 로그인이 필요합니다." },
        { status: 403, headers },
      );
    return NextResponse.json(data, { headers });
  }
  const state = data.state;
  return NextResponse.json(
    {
      revision: data.revision,
      state: {
        products: state.products.filter((product) => product.isActive),
        recipeChanges: Object.fromEntries(
          Object.entries(state.recipeChanges).filter(
            ([id]) => !hiddenContent(state, "recipe", id),
          ),
        ),
        otherChanges: Object.fromEntries(
          Object.entries(state.otherChanges ?? {}).filter(
            ([key, value]) =>
              !hiddenContent(state, key.split(":")[0], value.id) &&
              (key.startsWith("farm:") ||
                ("published" in value && value.published === true)),
          ),
        ),
        deletedKeys: [
          ...(state.deletedKeys ?? []),
          ...state.trash.map((entry) => `${entry.kind}:${entry.item.id}`),
          ...Object.entries(state.otherChanges ?? {})
            .filter(
              ([key, item]) =>
                key.startsWith("promotion:") &&
                "published" in item &&
                !item.published,
            )
            .map(([key]) => key),
        ],
        trash: [],
      },
    },
    { headers },
  );
}
const item = z
  .object({ id: z.string().min(1).max(100), name: z.string().min(1).max(200) })
  .passthrough();
const product = item.extend({
  price: z.number().int().min(1).max(2147483647),
  originalPrice: z.number().int().min(1),
  isActive: z.boolean(),
  stock: z.number().int().min(0).max(1000000).optional(),
});
const kind = z.enum(["product", "recipe", "farm", "promotion"]);
const action = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("products"),
    update: z.array(product).max(10000),
  }),
  z.object({
    type: z.literal("save-recipe"),
    recipe: item.extend({
      ingredients: z.array(z.unknown()),
      steps: z.array(z.unknown()),
      products: z.array(z.unknown()),
      vegetables: z.array(z.unknown()),
    }),
  }),
  z.object({ type: z.literal("save-farm"), farm: item }),
  z.object({
    type: z.literal("save-promotion"),
    promotion: item.extend({ published: z.boolean() }),
  }),
  z.object({
    type: z.literal("trash"),
    entry: z.object({ kind, item, deletedAt: z.iso.datetime() }),
  }),
  z.object({ type: z.literal("restore"), kind, id: z.string().min(1) }),
  z.object({
    type: z.literal("permanent-delete"),
    kind,
    id: z.string().min(1),
  }),
]);
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (
    !origin ||
    URL.canParse(origin) === false ||
    new URL(origin).host !== host
  )
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 403 });
  if (!(await getAdminAccess()).allowed)
    return NextResponse.json(
      { error: "관리자 로그인이 필요합니다." },
      { status: 403 },
    );
  try {
    const body = await request.text();
    if (Buffer.byteLength(body) > 25 * 1024 * 1024)
      return NextResponse.json(
        { error: "이미지 용량을 줄여 주세요." },
        { status: 413 },
      );
    const parsed = z
      .object({ revision: z.number().int().min(0), action })
      .safeParse(JSON.parse(body));
    if (!parsed.success)
      return NextResponse.json(
        { error: "저장할 정보를 확인해 주세요." },
        { status: 400 },
      );
    const data = mutateContent(
      parsed.data.action as AdminAction,
      parsed.data.revision,
    );
    revalidatePath("/", "layout");
    return NextResponse.json(data, { headers });
  } catch (error) {
    const conflict =
      error instanceof Error && error.message === "CONTENT_CONFLICT";
    return NextResponse.json(
      {
        error: conflict
          ? "다른 창에서 수정되었습니다. 새로고침 후 다시 저장해 주세요."
          : "저장하지 못했습니다.",
      },
      { status: conflict ? 409 : 500 },
    );
  }
}
