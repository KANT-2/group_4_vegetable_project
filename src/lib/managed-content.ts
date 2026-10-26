import {
  existsSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { isFastApiCatalog } from "./catalog-mode.ts";
import { products } from "../data/mock/products.ts";
import {
  adminReducer,
  type AdminAction,
  type AdminState,
} from "./admin-store.ts";

export const contentPath = () =>
  join(process.cwd(), "var", "managed-content", "catalog.json");
export type ContentSnapshot = { revision: number; state: AdminState };
export function readContent(path = contentPath()): ContentSnapshot {
  if (!existsSync(/* turbopackIgnore: true */ path))
    return { revision: 0, state: { products, recipeChanges: {}, trash: [] } };
  return JSON.parse(readFileSync(/* turbopackIgnore: true */ path, "utf8"));
}
// 단일 Node 서버에서 읽기·수정·파일 교체를 동기적으로 처리합니다.
export function mutateContent(
  action: AdminAction,
  revision: number,
  path = contentPath(),
) {
  const current = readContent(path);
  if (current.revision !== revision) throw new Error("CONTENT_CONFLICT");
  if (action.type === "hydrate") throw new Error("INVALID_ACTION");
  const next = {
    revision: current.revision + 1,
    state: adminReducer(current.state, action),
  };
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(next), "utf8");
  renameSync(temporary, path);
  return next;
}
export function hiddenContent(state: AdminState, kind: string, id: string) {
  return (
    state.deletedKeys?.includes(`${kind}:${id}`) ||
    state.trash.some((entry) => entry.kind === kind && entry.item.id === id)
  );
}
export function productUnavailable(id: string) {
  if (isFastApiCatalog()) return false;
  const { state } = readContent();
  const product = state.products.find((item) => item.id === id);
  return Boolean(
    hiddenContent(state, "product", id) ||
    (product && (!product.isActive || product.stock === 0)) ||
    (!product && products.some((item) => item.id === id)),
  );
}
