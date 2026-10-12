import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/redirect";

// React 서버 렌더 요청 안에서만 공유합니다. 계정 정보를 요청 사이에 캐시하지 않습니다.
export const getCurrentUser = cache(async () => {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    throw new Error(
      "로그인 상태를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
    );
  }
  return data.user;
});

export async function requireUser(next = "/mypage") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNextPath(next))}`);
  return user;
}
