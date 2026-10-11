// 로그인 없이 읽는 공개 데이터용 Supabase 연결 (레시피·상품·채소 조회)
// - 공개용 publishable key만 사용하고, 사용자 세션(쿠키)은 사용하지 않아요.
// - 읽기 권한은 DB의 RLS 정책이 결정해요. secret/service-role 키는 사용하지 않아요.
// 로그인 사용자용 연결(@supabase/ssr)은 C가 lib/supabase/server.ts 에 따로 만들어요.

import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createPublicSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, ..._PUBLISHABLE_KEY)가 없어요.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
