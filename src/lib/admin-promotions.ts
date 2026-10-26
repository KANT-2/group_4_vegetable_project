import { promotions } from "../data/promotions.ts";
import type { AdminPromotion, AdminState } from "./admin-store.ts";

export const promotionKindLabels = {
  coupon: "혜택 안내",
  delivery: "배송 안내",
  experience: "이벤트 안내",
};

export function managedPromotions(
  state: Pick<AdminState, "otherChanges" | "trash" | "deletedKeys">,
): AdminPromotion[] {
  const items = new Map(
    promotions.map((promo) => [
      promo.slug,
      {
        ...promo,
        id: promo.slug,
        name: promo.title,
        published: true,
      } as AdminPromotion,
    ]),
  );
  for (const [key, item] of Object.entries(state.otherChanges ?? {})) {
    if (key.startsWith("promotion:"))
      items.set(item.id, item as AdminPromotion);
  }
  const removed = new Set([
    ...state.trash
      .filter((entry) => entry.kind === "promotion")
      .map((entry) => entry.item.id),
    ...(state.deletedKeys ?? [])
      .filter((key) => key.startsWith("promotion:"))
      .map((key) => key.slice(10)),
  ]);
  return [...items.values()].filter((item) => !removed.has(item.id));
}

export function safePromotionHref(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\s\u0000-\u001f]/.test(value)
  );
}
