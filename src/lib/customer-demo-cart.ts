import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";

export type DemoCartItem = { productId: string; quantity: number };
const defaultPath = () =>
  join(process.cwd(), "var", "customer-demo", "qwer-cart.json");
export function readDemoCart(path = defaultPath()): DemoCartItem[] {
  if (!existsSync(path)) return [];
  const data: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (
    !Array.isArray(data) ||
    !data.every(
      (item) =>
        item &&
        typeof item.productId === "string" &&
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= 99,
    )
  )
    throw new Error("Invalid cart data");
  return data;
}
export function changeDemoCart(
  productId: string,
  mode: "add" | "update" | "remove",
  quantity = 1,
  path = defaultPath(),
) {
  if (process.env.NODE_ENV !== "development")
    throw new Error("Development only");
  if (
    mode !== "remove" &&
    (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
  )
    throw new Error("Invalid quantity");
  const items = readDemoCart(path);
  const previous = items.find((item) => item.productId === productId);
  if (mode === "update" && !previous) throw new Error("Cart item not found");
  const nextQuantity =
    mode === "add"
      ? Math.min(99, (previous?.quantity ?? 0) + quantity)
      : quantity;
  const next = items.filter((item) => item.productId !== productId);
  if (mode !== "remove") next.unshift({ productId, quantity: nextQuantity });
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(temporary, JSON.stringify(next));
  renameSync(temporary, path);
  return mode === "remove" ? 0 : nextQuantity;
}
