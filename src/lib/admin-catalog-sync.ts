import "server-only";
import { fastApi, FastApiError } from "@/lib/fastapi";
import { catalogProduct, type CatalogPage } from "@/lib/catalog-api";
import type { AdminAction, AdminProduct, AdminState } from "@/lib/admin-store";

// 관리자 상품 화면(AdminProducts)의 저장을 Supabase(FastAPI)에 반영해요.
// 화면은 예전처럼 상품 목록 전체를 보내고, 여기서 DB 와 비교해 바뀐 상품만 등록·수정해요.
// 휴지통 이동은 판매 중지(고객 화면에서 숨김), 복원은 원래 판매 상태로, 영구 삭제는 DB 에서 지워요.

const ADMIN = "/api/v1/catalog/admin/products";

export class CatalogSyncError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function adminCatalogProducts(
  token: string,
): Promise<AdminProduct[]> {
  const items: AdminProduct[] = [];
  for (let page = 1; ; page++) {
    const result = await fastApi<CatalogPage>(
      `${ADMIN}?status=all&sort=newest&page=${page}&size=100`,
      {},
      token,
    );
    items.push(...result.items.map(catalogProduct));
    if (!result.items.length || page * result.size >= result.total)
      return items;
  }
}

// 화면 상품 → API 칸 이름. 값이 없는 칸은 보내지 않아요.
function apiFields(product: AdminProduct) {
  return {
    name: product.name,
    unit: product.unit,
    farm_name: product.farmName,
    farm_region: product.farmRegion,
    vegetable_id: product.vegetableId,
    ugly_reason: product.uglyReason,
    price: product.price,
    original_price: product.originalPrice,
    is_active: product.isActive,
    stock: product.stock,
  };
}

function changedFields(before: AdminProduct, after: AdminProduct) {
  const previous = apiFields(before);
  return Object.fromEntries(
    Object.entries(apiFields(after)).filter(
      ([key, value]) =>
        value !== undefined &&
        value !== "" &&
        value !== previous[key as keyof typeof previous],
    ),
  );
}

async function uploadImage(token: string, id: string, dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match)
    throw new CatalogSyncError("이미지는 JPG·PNG·WebP 형식만 올릴 수 있어요.");
  const form = new FormData();
  form.append(
    "image",
    new Blob([Buffer.from(match[2], "base64")], { type: match[1] }),
    `${id}.${match[1].split("/")[1]}`,
  );
  await fastApi(
    `${ADMIN}/${encodeURIComponent(id)}/image`,
    { method: "PUT", body: form },
    token,
  );
}

async function syncProducts(
  token: string,
  next: AdminProduct[],
  state: AdminState,
) {
  const current = new Map(
    (await adminCatalogProducts(token)).map((product) => [product.id, product]),
  );
  const trashed = new Set(
    state.trash
      .filter((entry) => entry.kind === "product")
      .map((entry) => entry.item.id),
  );
  for (const product of next) {
    const before = current.get(product.id);
    if (!before) {
      if (trashed.has(product.id)) continue;
      const { original_price: _ignored, ...fields } = apiFields(product);
      void _ignored; // 등록할 때 정상가는 판매가와 같게 시작해요.
      await fastApi(
        ADMIN,
        {
          method: "POST",
          body: JSON.stringify({ id: product.id, ...fields }),
        },
        token,
      );
    } else {
      const changes = changedFields(before, product);
      if (Object.keys(changes).length)
        await fastApi(
          `${ADMIN}/${encodeURIComponent(product.id)}`,
          { method: "PATCH", body: JSON.stringify(changes) },
          token,
        );
    }
    if (
      product.imageUrl?.startsWith("data:") &&
      product.imageUrl !== before?.imageUrl
    )
      await uploadImage(token, product.id, product.imageUrl);
  }
}

async function setActive(token: string, id: string, isActive: boolean) {
  try {
    await fastApi(
      `${ADMIN}/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify({ is_active: isActive }) },
      token,
    );
  } catch (error) {
    // 이미 DB 에서 지워진 상품이면 휴지통 기록만 정리하면 돼요.
    if (!(error instanceof FastApiError && error.status === 404)) throw error;
  }
}

// managed-content 저장 전에 상품 관련 동작을 DB 에 먼저 반영해요. 실패하면 저장하지 않고 오류를 알려요.
export async function applyCatalogAction(
  token: string | undefined,
  action: AdminAction,
  state: AdminState,
) {
  const touchesProducts =
    action.type === "products" ||
    (["trash", "restore", "permanent-delete"].includes(action.type) &&
      ("entry" in action
        ? action.entry.kind === "product"
        : "kind" in action && action.kind === "product"));
  if (!touchesProducts) return;
  if (!token)
    throw new CatalogSyncError(
      "상품 저장은 FastAPI 관리자 계정(admin@naver.com)으로 로그인해야 해요.",
      403,
    );
  try {
    if (action.type === "products") {
      if (typeof action.update === "function")
        throw new CatalogSyncError("저장할 상품 목록을 확인해 주세요.");
      await syncProducts(token, action.update, state);
    } else if (action.type === "trash" && action.entry.kind === "product") {
      await setActive(token, action.entry.item.id, false);
    } else if (action.type === "restore") {
      const entry = state.trash.find(
        (value) => value.kind === "product" && value.item.id === action.id,
      );
      if (entry?.kind === "product")
        await setActive(token, action.id, entry.item.isActive);
    } else if (action.type === "permanent-delete") {
      try {
        await fastApi(
          `${ADMIN}/${encodeURIComponent(action.id)}`,
          { method: "DELETE" },
          token,
        );
      } catch (error) {
        // 주문 기록이 있는 상품(409)은 판매 중지로 남기고 관리 목록에서만 숨겨요. 없는 상품(404)은 이미 지워진 것이에요.
        if (!(
          error instanceof FastApiError && [404, 409].includes(error.status)
        ))
          throw error;
      }
    }
  } catch (error) {
    if (error instanceof FastApiError)
      throw new CatalogSyncError(
        error.message,
        error.status === 401 || error.status === 403 ? 403 : 400,
      );
    throw error;
  }
}
