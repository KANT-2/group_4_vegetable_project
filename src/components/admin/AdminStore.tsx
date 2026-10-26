"use client";

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useState,
  useEffect,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AdminAction } from "@/lib/admin-store";
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
  const pathname = usePathname();
  const router = useRouter();
  const current = useRef({ revision: 0, state });
  const queue = useRef(Promise.resolve());
  const ready = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    let disposed = false;
    let version: string | undefined;
    const check = async () => {
      try {
        const response = await fetch("/api/catalog-version", {
          cache: "no-store",
        });
        if (!response.ok || disposed) return;
        const next = (await response.json()).version as string;
        if (disposed) return;
        if (version !== undefined && version !== next) router.refresh();
        version = next;
      } catch {
        /* Keep the current page when the API is offline. */
      }
    };
    void check();
    const timer = window.setInterval(check, 3000);
    window.addEventListener("focus", check);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [router]);
  useEffect(() => {
    let disposed = false;
    let loaded = false;
    const admin = pathname === "/admin" || pathname.startsWith("/admin/");
    const refresh = async () => {
      if (saving) return;
      try {
        if (loaded && ready.current) {
          const version = await fetch("/api/managed-content?version=1", {
            cache: "no-store",
          });
          if (
            version.ok &&
            (await version.json()).revision === current.current.revision
          )
            return;
        }
        const response = await fetch(
          admin ? "/admin/api/content?admin=1" : "/api/managed-content",
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const data = await response.json();
        if (disposed) return;
        const changed =
          ready.current && current.current.revision !== data.revision;
        current.current = data;
        ready.current = true;
        loaded = true;
        dispatch({ type: "hydrate", state: data.state });
        if (changed && !admin) router.refresh();
      } catch {
        /* Keep the last confirmed content while offline. */
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 3000);
    window.addEventListener("focus", refresh);
    return () => {
      disposed = true;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [pathname, router, saving]);
  function persist(action: AdminAction) {
    queue.current = queue.current.then(async () => {
      setSaving(true);
      setSaveError("");
      try {
        if (!ready.current)
          throw new Error(
            "데이터를 불러오는 중입니다. 잠시 후 다시 저장해 주세요.",
          );
        const serializable =
          action.type === "products" && typeof action.update === "function"
            ? {
                ...action,
                update: action.update(current.current.state.products),
              }
            : action;
        const response = await fetch("/admin/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision: current.current.revision,
            action: serializable,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        current.current = data;
        dispatch({ type: "hydrate", state: data.state });
        router.refresh();
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "저장하지 못했습니다.",
        );
      } finally {
        setSaving(false);
      }
    });
  }
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
        setProducts: (update) => persist({ type: "products", update }),
        saveRecipe: (recipe) => persist({ type: "save-recipe", recipe }),
        saveFarm: (farm) => persist({ type: "save-farm", farm }),
        savePromotion: (promotion) =>
          persist({ type: "save-promotion", promotion }),
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
          persist({
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
          persist({ type: "restore", kind, id });
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
          persist({ type: "permanent-delete", kind, id });
          return true;
        },
      }}
    >
      {children}
      {(saving || saveError) && (
        <div
          role={saveError ? "alert" : "status"}
          className="fixed bottom-5 left-1/2 z-[100] max-w-[90vw] -translate-x-1/2 rounded-xl border border-line bg-white px-5 py-3 text-sm shadow-lg"
        >
          {saveError || "서버에 저장하고 있어요…"}
        </div>
      )}
      {request && <ConfirmDialog {...request} onResult={finish} />}
    </Context.Provider>
  );
}
export function useAdminStore() {
  const store = useContext(Context);
  if (!store) throw new Error("AdminStore가 필요합니다.");
  return store;
}
