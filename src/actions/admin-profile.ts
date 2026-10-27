"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { adminRegistrationClient } from "@/lib/admin-registration-server";
import { hasPasswordSession, saveSessionAdminProfile } from "@/lib/admin-auth";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { cookies } from "next/headers";
import { fastApi } from "@/lib/fastapi";

export async function updateAdminName(
  _previous: { error: string; success: string },
  form: FormData,
) {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!name || name.length > 60)
    return { error: "이름을 1~60자로 입력해 주세요.", success: "" };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "올바른 이메일 주소를 입력해 주세요.", success: "" };
  try {
    if (await hasPasswordSession()) {
      await saveSessionAdminProfile({ name, email });
      revalidatePath("/admin/mypage");
      return {
        error: "",
        success:
          "관리자 정보가 저장되었습니다. 현재 로그인 세션 동안 유지됩니다.",
      };
    }
    const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
    if (token) {
      if (name.length < 2 || name.length > 20)
        return { error: "이름은 2~20자로 입력해 주세요.", success: "" };
      const account = await fastApi<{ email: string }>("/api/v1/accounts/me", {}, token);
      if (email !== account.email.toLowerCase())
        return { error: "이 계정의 이메일은 여기서 변경할 수 없습니다.", success: "" };
      await fastApi(
        "/api/v1/accounts/me/profile",
        { method: "PATCH", body: JSON.stringify({ nickname: name }) },
        token,
      );
      revalidatePath("/admin/mypage");
      return { error: "", success: "관리자 이름이 저장되었습니다." };
    }
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user || user.app_metadata?.role !== "admin")
      return { error: "관리자 계정으로 다시 로그인해 주세요.", success: "" };
    const registry = adminRegistrationClient();
    const changingEmail = email !== user.email?.toLowerCase();
    if (changingEmail) {
      const { data: duplicate, error: lookupError } = await registry
        .from("admin_registrations")
        .select("id")
        .eq("email_key", email)
        .neq("id", user.id)
        .maybeSingle();
      if (lookupError || duplicate)
        return {
          error: duplicate
            ? "이미 사용 중인 이메일입니다."
            : "이메일을 확인하지 못했습니다. 다시 시도해 주세요.",
          success: "",
        };
    }
    // 요청으로 사용자 ID를 받지 않고 인증한 본인 행만 수정합니다.
    const { data, error: saveError } = await registry
      .from("admin_registrations")
      .update({ display_name: name })
      .eq("id", user.id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();
    if (saveError || !data)
      return {
        error:
          "관리자 계정 등록 상태를 확인해 주세요. 이름을 저장하지 못했습니다.",
        success: "",
      };
    if (changingEmail) {
      const { error: emailError } = await supabase.auth.updateUser({ email });
      if (emailError)
        return {
          error:
            "이름은 저장했지만 이메일 변경 요청은 완료하지 못했습니다. 중복 여부를 확인한 후 다시 시도해 주세요.",
          success: "",
        };
    }
    revalidatePath("/admin/mypage");
    return {
      error: "",
      success: changingEmail
        ? "이름이 저장되었습니다. 이메일 변경은 인증 메일의 안내를 완료하면 반영됩니다."
        : "관리자 정보가 저장되었습니다.",
    };
  } catch {
    return {
      error:
        "계정 정보 저장에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      success: "",
    };
  }
}
