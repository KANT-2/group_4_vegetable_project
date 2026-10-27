"use client";

import { useEffect, useRef } from "react";

export function RecipeViewTracker({ recipeId }: { recipeId: string }) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    if (sent.current === recipeId) return;
    const record = () => {
      if (document.visibilityState !== "visible") return;
      sent.current = recipeId;
      document.removeEventListener("visibilitychange", record);
      void fetch("/api/recipe-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
        keepalive: true,
      }).catch(() => undefined);
    };
    if (document.visibilityState === "visible") record();
    else document.addEventListener("visibilitychange", record);
    return () => document.removeEventListener("visibilitychange", record);
  }, [recipeId]);
  return null;
}
