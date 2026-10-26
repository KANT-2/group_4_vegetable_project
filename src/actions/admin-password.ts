"use server";

import { createClient as createAuthClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireSupabaseConfig } from "@/lib/supabase/config";
import {
  hasPasswordSession,
  changeLocalAdminPassword,
  createAdminSession,
  getSessionAdminProfile,
  saveSessionAdminProfile,
} from "@/lib/admin-auth";
import { adminPasswordError } from "@/lib/admin-password-validation";

export async function changeAdminPassword(
  _previous: { error: string; success: string },
  form: FormData,
) {
  const current = String(form.get("currentPassword") ?? "");
  const password = String(form.get("newPassword") ?? "");
  const confirmation = String(form.get("confirmPassword") ?? "");
  const invalid = adminPasswordError(current, password, confirmation);
  if (invalid) return { error: invalid, success: "" };
  try {
    if (await hasPasswordSession()) {
      const profile = await getSessionAdminProfile();
      if (!changeLocalAdminPassword(current, password))
        return {
          error:
            "현재 비밀번호를 확인해 주세요. 운영 환경의 공용 계정은 서버 설정에서 변경해야 합니다.",
          success: "",
        };
      await createAdminSession();
      if (profile) await saveSessionAdminProfile(profile);
      return {
        error: "",
        success:
          "비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.",
      };
    }
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user || user.app_metadata?.role !== "admin")
      return { error: "관리자 계정으로 다시 로그인해 주세요.", success: "" };
    if (
      !user.email ||
      !user.identities?.some((identity) => identity.provider === "email")
    )
      return {
        error: "Google 계정의 비밀번호는 Google 계정 설정에서 변경해 주세요.",
        success: "",
      };
    const config = requireSupabaseConfig();
    // 현재 브라우저 세션을 교체하지 않는 독립된 클라이언트로 본인 비밀번호 확인.
    const verifier = createAuthClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data: verified, error: verifyError } =
      await verifier.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
    if (verifyError || verified.user?.id !== user.id)
      return { error: "현재 비밀번호가 올바르지 않습니다.", success: "" };
    await verifier.auth.signOut({ scope: "local" });
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      current_password: current,
    });
    if (updateError)
      return {
        error:
          updateError.code === "same_password"
            ? "현재 비밀번호와 다른 비밀번호를 입력해 주세요."
            : "비밀번호를 변경하지 못했습니다. 비밀번호 조건과 로그인 상태를 확인해 주세요.",
        success: "",
      };
    return {
      error: "",
      success:
        "비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.",
    };
  } catch {
    return {
      error: "비밀번호 변경에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      success: "",
    };
  }
}
