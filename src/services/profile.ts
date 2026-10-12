import "server-only";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function getProfile() {
  const user = await requireUser();
  const supabase = await createClient();
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
