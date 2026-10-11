"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { NavigationState } from "@/types/navigation";

interface NavigationContextValue {
  state: NavigationState | null;
  error: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
}
const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<NavigationState | null>(null);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const clear = useCallback(() => {
    request.current?.abort();
    setState({ user: null, cartCount: 0 });
    setError(false);
  }, []);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/navigation", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("navigation unavailable");
      const data: NavigationState = await response.json();
      if (controller.signal.aborted) return;
      setState(data);
      setError(false);
    } catch {
      if (controller.signal.aborted) return;
      setState(null);
      setError(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const onFocus = () => {
      setState(null);
      setError(false);
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const subscription = getSupabaseConfig()
      ? createClient().auth.onAuthStateChange(() => {
          // 다른 계정의 상태를 지우고 cookie 갱신 후 다시 확인합니다.
          request.current?.abort();
          setState(null);
          setError(false);
          queueMicrotask(() => {
            if (active) void refresh();
          });
        }).data.subscription
      : null;
    return () => {
      active = false;
      subscription?.unsubscribe();
      window.removeEventListener("focus", onFocus);
      request.current?.abort();
    };
  }, [refresh]);

  return (
    <NavigationContext.Provider value={{ state, error, refresh, clear }}>
      <Suspense fallback={null}>
        <NavigationRefresh />
      </Suspense>
      {children}
    </NavigationContext.Provider>
  );
}

function NavigationRefresh() {
  const pathname = usePathname();
  const { refresh } = useNavigation();
  useEffect(() => {
    void refresh();
  }, [pathname, refresh]);
  return null;
}

export function useNavigation() {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("NavigationProvider 안에서 사용해주세요.");
  return value;
}
