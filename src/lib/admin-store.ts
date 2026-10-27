import type { Product } from "../types/product.ts";
import type { VegetableCategory } from "../types/vegetable.ts";
import type { Recipe } from "../types/recipe.ts";
import type { FarmStory } from "../types/showcase.ts";
import type { FarmStoryDetail } from "../data/farm-stories.ts";
import type { Promotion } from "../data/promotions.ts";

export type AdminPromotion = Promotion & {
  id: string;
  name: string;
  published: boolean;
  [key: string]: unknown;
};

export type AdminFarm = FarmStory & {
  id: string;
  name: string;
  imageUrl: string;
  additionalImageUrls?: string[];
  address?: string;
  latitude?: number;
  longitude?: number;
  mapEmbedUrl?: string;
  detail?: FarmStoryDetail;
  crops: string[];
  [key: string]: unknown;
};

export type AdminProduct = Product & {
  category?: VegetableCategory;
  registered?: boolean;
};
export type TrashEntry = {
  deletedAt: string;
} & (
  | { kind: "product"; item: AdminProduct }
  | { kind: "recipe"; item: Recipe }
  | {
      kind: "farm" | "promotion";
      item: { id: string; name: string; [key: string]: unknown };
    }
);
export type AdminState = {
  products: AdminProduct[];
  recipeChanges: Record<string, Recipe>;
  trash: TrashEntry[];
  otherChanges?: Record<string, TrashEntry["item"]>;
  deletedKeys?: string[];
};
export type AdminAction =
  | { type: "hydrate"; state: AdminState }
  | {
      type: "products";
      update: AdminProduct[] | ((products: AdminProduct[]) => AdminProduct[]);
    }
  | { type: "save-recipe"; recipe: Recipe }
  | { type: "save-farm"; farm: AdminFarm }
  | { type: "save-promotion"; promotion: AdminPromotion }
  | { type: "trash"; entry: TrashEntry }
  | { type: "restore"; kind: TrashEntry["kind"]; id: string }
  | { type: "permanent-delete"; kind: TrashEntry["kind"]; id: string };

export function adminReducer(
  state: AdminState,
  action: AdminAction,
): AdminState {
  if (action.type === "hydrate") return action.state;
  if (action.type === "save-promotion")
    return {
      ...state,
      otherChanges: {
        ...state.otherChanges,
        [`promotion:${action.promotion.id}`]: action.promotion,
      },
    };
  if (action.type === "save-farm")
    return {
      ...state,
      otherChanges: {
        ...state.otherChanges,
        [`farm:${action.farm.id}`]: action.farm,
      },
    };
  if (action.type === "products")
    return {
      ...state,
      products:
        typeof action.update === "function"
          ? action.update(state.products)
          : action.update,
    };
  if (action.type === "save-recipe")
    return {
      ...state,
      recipeChanges: {
        ...state.recipeChanges,
        [action.recipe.id]: action.recipe,
      },
    };
  if (action.type === "trash") {
    const entry = action.entry;
    if (
      state.trash.some(
        (value) => value.kind === entry.kind && value.item.id === entry.item.id,
      )
    )
      return state;
    return {
      ...state,
      products:
        entry.kind === "product"
          ? state.products.filter((product) => product.id !== entry.item.id)
          : state.products,
      trash: [entry, ...state.trash],
    };
  }
  const entry = state.trash.find(
    (value) => value.kind === action.kind && value.item.id === action.id,
  );
  if (!entry) return state;
  if (action.type === "permanent-delete") {
    const recipeChanges = { ...state.recipeChanges };
    const otherChanges = { ...state.otherChanges };
    if (entry.kind === "recipe") delete recipeChanges[entry.item.id];
    delete otherChanges[`${entry.kind}:${entry.item.id}`];
    return {
      ...state,
      recipeChanges,
      otherChanges,
      deletedKeys: [
        ...(state.deletedKeys ?? []),
        `${entry.kind}:${entry.item.id}`,
      ],
      trash: state.trash.filter(
        (value) => !(value.kind === action.kind && value.item.id === action.id),
      ),
    };
  }
  // 같은 ID의 상품이 이미 있으면 복원으로 중복 생성하지 않습니다.
  if (
    entry.kind === "product" &&
    state.products.some((product) => product.id === entry.item.id)
  )
    return state;
  return {
    ...state,
    products:
      entry.kind === "product"
        ? [entry.item, ...state.products]
        : state.products,
    recipeChanges:
      entry.kind === "recipe"
        ? { ...state.recipeChanges, [entry.item.id]: entry.item }
        : state.recipeChanges,
    ...(entry.kind === "farm" || entry.kind === "promotion"
      ? {
          otherChanges: {
            ...state.otherChanges,
            [`${entry.kind}:${entry.item.id}`]: entry.item,
          },
        }
      : {}),
    trash: state.trash.filter(
      (value) => !(value.kind === action.kind && value.item.id === action.id),
    ),
  };
}
