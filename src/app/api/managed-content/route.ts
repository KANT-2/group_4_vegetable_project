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
import { isFastApiCatalog } from "@/lib/catalog-mode";
import { catalogToken } from "@/lib/catalog-api";
import {
  adminCatalogProducts,
  applyCatalogAction,
  CatalogSyncError,
} from "@/lib/admin-catalog-sync";

// 실제 DB 모드에서 관리자 화면의 상품 목록은 Supabase(FastAPI) 값이에요.
// 휴지통·영구 삭제로 숨긴 상품은 빼고 보여 줘요. (레시피·농가 등 나머지는 기존처럼 파일에 저장해요.)
async function withCatalogProducts(data: ReturnType<typeof readContent>) {
  if (!isFastApiCatalog()) return data;
  const token = await catalogToken();
  if (!token) return data;
  const products = (await adminCatalogProducts(token)).filter(
    (product) => !hiddenContent(data.state, "product", product.id),
  );
  return { ...data, state: { ...data.state, products } };
}

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
    try {
      return NextResponse.json(await withCatalogProducts(data), { headers });
    } catch {
      return NextResponse.json(
        {
          error:
            "상품 목록을 불러오지 못했습니다. 백엔드 서버를 확인해 주세요.",
        },
        { status: 503, headers },
      );
    }
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
    const current = readContent();
    if (current.revision !== parsed.data.revision)
      throw new Error("CONTENT_CONFLICT");
    // 상품 변경은 DB 에 먼저 반영하고, 성공했을 때만 휴지통 기록 등을 파일에 남겨요.
    if (isFastApiCatalog())
      await applyCatalogAction(
        await catalogToken(),
        parsed.data.action as AdminAction,
        current.state,
      );
    const data = mutateContent(
      parsed.data.action as AdminAction,
      parsed.data.revision,
    );
    revalidatePath("/", "layout");
    return NextResponse.json(await withCatalogProducts(data), { headers });
  } catch (error) {
    if (error instanceof CatalogSyncError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
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
