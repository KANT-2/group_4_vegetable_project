"use server";

import { createClient } from "@/lib/supabase/server";
import { adminRegistrationClient } from "@/lib/admin-registration-server";
import { adminSignupError } from "@/lib/admin-signup-validation";
import { googleCallbackUrl } from "@/lib/auth-urls";

export type AdminSignupState = { error: string; success: string };

export async function adminSignUp(
  _previous: AdminSignupState,
  form: FormData,
): Promise<AdminSignupState> {
  const input = {
    id: String(form.get("id") ?? "").trim(),
    password: String(form.get("password") ?? ""),
    confirmPassword: String(form.get("confirmPassword") ?? ""),
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
  };
  const error = adminSignupError(input);
  if (error) return { error, success: "" };
  try {
    const registry = adminRegistrationClient();
    // 설정이 없으면 가입 요청을 보내지 않습니다. DB UNIQUE가 최종 중복 판정을 합니다.
    const [byId, byEmail] = await Promise.all([
      registry
        .from("admin_registrations")
        .select("id")
        .eq("username_key", input.id.toLowerCase())
        .limit(1),
      registry
        .from("admin_registrations")
        .select("id")
        .eq("email_key", input.email)
        .limit(1),
    ]);
    if (byId.error || byEmail.error)
      throw new Error("registration schema unavailable");
    if (byId.data?.length || byEmail.data?.length)
      return { error: "이미 사용 중인 아이디 또는 이메일입니다.", success: "" };
    const supabase = await createClient();
    const { data, error: signupError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          admin_signup: true,
          admin_username: input.id,
          admin_display_name: input.name,
        },
        emailRedirectTo: googleCallbackUrl(
          process.env.NEXT_PUBLIC_SITE_URL,
          "/admin/signup/complete",
        ),
      },
    });
    if (signupError || !data.user || data.user.identities?.length === 0)
      return {
        error:
          "가입하지 못했습니다. 아이디·이메일 중복 또는 비밀번호 조건을 확인해 주세요.",
        success: "",
      };
    const { data: registration, error: registrationError } = await registry
      .from("admin_registrations")
      .select("username_key,email_key")
      .eq("id", data.user.id)
      .maybeSingle();
    if (
      registrationError ||
      registration?.username_key !== input.id.toLowerCase() ||
      registration?.email_key !== input.email
    )
      return {
        error:
          "가입 신청을 확인하지 못했습니다. 기존 계정 여부를 확인하거나 관리자에게 문의해 주세요.",
        success: "",
      };
    return {
      error: "",
      success:
        "가입 신청이 접수되었습니다. 이메일 인증 후 관리자 승인을 기다려 주세요.",
    };
  } catch {
    return {
      error:
        "회원가입 연결 설정을 확인해야 합니다. 잠시 후 다시 시도해 주세요.",
      success: "",
    };
  }
}

export async function completeGoogleAdminSignup(
  _previous: AdminSignupState,
  form: FormData,
): Promise<AdminSignupState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (
      error ||
      !user ||
      !user.email_confirmed_at ||
      !user.identities?.some((identity) => identity.provider === "google")
    )
      return { error: "먼저 Google 계정 인증을 완료해 주세요.", success: "" };
    const input = {
      id: String(form.get("id") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      email: user.email ?? "",
      password: "",
      confirmPassword: "",
    };
    const invalid = adminSignupError(input, true);
    if (invalid) return { error: invalid, success: "" };
    const registry = adminRegistrationClient();
    const { error: insertError } = await registry
      .from("admin_registrations")
      .insert({
        id: user.id,
        username: input.id,
        email: input.email,
        display_name: input.name,
      });
    if (insertError)
      return {
        error:
          insertError.code === "23505"
            ? "이미 가입한 계정이거나 사용 중인 아이디·이메일입니다."
            : "가입 신청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        success: "",
      };
    return {
      error: "",
      success:
        "Google 계정으로 가입 신청이 접수되었습니다. 관리자 승인을 기다려 주세요.",
    };
  } catch {
    return {
      error:
        "회원가입 연결 설정을 확인해야 합니다. 잠시 후 다시 시도해 주세요.",
      success: "",
    };
  }
}
