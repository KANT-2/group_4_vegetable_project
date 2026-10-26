"use client";

import { createContext, useContext, useReducer, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";
import type { Dispatch, SetStateAction } from "react";
import { products } from "@/data/mock/products";
import {
  adminReducer,
  type AdminProduct,
  type AdminFarm,
  type AdminPromotion,
  type AdminState,
  type TrashEntry,
} from "@/lib/admin-store";
import type { Recipe } from "@/types/recipe";

type Store = AdminState & {
  setProducts: Dispatch<SetStateAction<AdminProduct[]>>;
  saveRecipe: (recipe: Recipe) => void;
  saveFarm: (farm: AdminFarm) => void;
  savePromotion: (promotion: AdminPromotion) => void;
  moveToTrash: (
    entry:
      | Omit<Extract<TrashEntry, { kind: "product" }>, "deletedAt">
      | Omit<Extract<TrashEntry, { kind: "recipe" }>, "deletedAt">
      | {
          kind: "farm" | "promotion";
          item: { id: string; name: string; [key: string]: unknown };
        },
  ) => Promise<boolean>;
  restore: (kind: TrashEntry["kind"], id: string) => Promise<boolean>;
  permanentlyDelete: (kind: TrashEntry["kind"], id: string) => Promise<boolean>;
};
const Context = createContext<Store | null>(null);
export function AdminStore({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(adminReducer, {
    products,
    recipeChanges: {},
    trash: [],
  });
  type Request = {
    message: string;
    name?: string;
    detail: string;
    confirmLabel: string;
  };
  const [request, setRequest] = useState<Request | null>(null);
  const resolveRequest = useRef<((value: boolean) => void) | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  function ask(value: Request) {
    if (resolveRequest.current) return Promise.resolve(false);
    trigger.current = document.activeElement as HTMLElement;
    return new Promise<boolean>((resolve) => {
      resolveRequest.current = resolve;
      setRequest(value);
    });
  }
  function finish(value: boolean) {
    const resolve = resolveRequest.current;
    if (!resolve) return;
    resolveRequest.current = null;
    setRequest(null);
    resolve(value);
    queueMicrotask(() => {
      if (trigger.current?.isConnected) trigger.current.focus();
    });
  }
  return (
    <Context.Provider
      value={{
        ...state,
        setProducts: (update) => dispatch({ type: "products", update }),
        saveRecipe: (recipe) => dispatch({ type: "save-recipe", recipe }),
        saveFarm: (farm) => dispatch({ type: "save-farm", farm }),
        savePromotion: (promotion) =>
          dispatch({ type: "save-promotion", promotion }),
        moveToTrash: async (entry) => {
          if (
            !(await ask({
              message: "해당 내용을 삭제 하시겠습니까?",
              name: entry.item.name,
              detail: "삭제한 항목은 휴지통으로 이동하며, 복원할 수 있습니다.",
              confirmLabel: "삭제",
            }))
          )
            return false;
          dispatch({
            type: "trash",
            entry: { ...entry, deletedAt: new Date().toISOString() },
          });
          return true;
        },
        restore: async (kind, id) => {
          const entry = state.trash.find(
            (value) => value.kind === kind && value.item.id === id,
          );
          if (!entry) return false;
          if (
            kind === "product" &&
            state.products.some((product) => product.id === id)
          )
            return false;
          if (
            !(await ask({
              message: "해당 내용을 복원 하시겠습니까?",
              name: entry.item.name,
              detail: "항목을 원래 관리 목록으로 복원합니다.",
              confirmLabel: "복원",
            }))
          )
            return false;
          dispatch({ type: "restore", kind, id });
          return true;
        },
        permanentlyDelete: async (kind, id) => {
          const entry = state.trash.find(
            (value) => value.kind === kind && value.item.id === id,
          );
          if (
            !entry ||
            !(await ask({
              message: "해당 내용을 삭제 하시겠습니까?",
              name: entry.item.name,
              detail: "휴지통에서 삭제하면 복원할 수 없습니다.",
              confirmLabel: "삭제",
            }))
          )
            return false;
          dispatch({ type: "permanent-delete", kind, id });
          return true;
        },
      }}
    >
      {children}
      {request && <ConfirmDialog {...request} onResult={finish} />}
    </Context.Provider>
  );
}
export function useAdminStore() {
  const store = useContext(Context);
  if (!store) throw new Error("AdminStore가 필요합니다.");
  return store;
}
