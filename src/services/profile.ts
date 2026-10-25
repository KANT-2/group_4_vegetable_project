import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { fastApi, type FastApiUser } from "@/lib/fastapi";

export async function getProfile() {
  const user = await requireUser();
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) {
    const me = await fastApi<FastApiUser>("/api/v1/accounts/me", {}, token);
    if (me.id !== user.id) throw new Error("계정 정보가 일치하지 않습니다.");
    const shipping = me.profile.shipping_address;
    return {
      id: me.id,
      nickname: me.profile.nickname,
      recipient_name: shipping?.recipient_name ?? null,
      recipient_phone: shipping?.recipient_phone ?? null,
      postal_code: shipping?.postal_code ?? null,
      address: shipping?.address ?? null,
      address_detail: shipping?.address_detail ?? null,
    };
  }
  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) throw new Error("프로필을 불러오지 못했습니다.");
  if (existing) return existing;

  // 기존 닉네임을 덮어쓰지 않고, 프로필 없는 테스트 계정도 지원합니다.
  const { error: insertError } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, nickname: "새싹회원" },
      { onConflict: "id", ignoreDuplicates: true },
    );
  if (insertError) throw new Error("프로필을 준비하지 못했습니다.");

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw new Error("프로필을 불러오지 못했습니다.");
  return data;
}
