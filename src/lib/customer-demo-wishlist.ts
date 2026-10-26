import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";

const defaultPath = () =>
  join(process.cwd(), "var", "customer-demo", "qwer-wishlist.json");
export function readDemoWishlist(path = defaultPath()): string[] {
  if (!existsSync(path)) return [];
  const data: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(data) || !data.every((id) => typeof id === "string"))
    throw new Error("Invalid wishlist data");
  return [...new Set(data)];
}
export function writeDemoWish(
  productId: string,
  wished: boolean,
  path = defaultPath(),
) {
  if (process.env.NODE_ENV !== "development")
    throw new Error("Development only");
  const previous = readDemoWishlist(path);
  const next = wished
    ? [productId, ...previous.filter((id) => id !== productId)]
    : previous.filter((id) => id !== productId);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(temporary, JSON.stringify(next));
  renameSync(temporary, path);
}
