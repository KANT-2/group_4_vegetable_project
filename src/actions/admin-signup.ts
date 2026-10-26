"use server";

import { adminSignupError } from "@/lib/admin-signup-validation";
import { fastApi, FastApiError } from "@/lib/fastapi";

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
    await fastApi<{ status: "pending" }>(
      "/api/v1/accounts/admin-registrations",
      {
        method: "POST",
        body: JSON.stringify({
          username: input.id,
          password: input.password,
          display_name: input.name,
          email: input.email,
        }),
      },
    );
    return {
      error: "",
      success: "가입 신청이 접수되었습니다. 관리자 승인을 기다려 주세요.",
    };
  } catch (error) {
    if (error instanceof FastApiError && error.status === 409)
      return { error: "이미 사용 중인 아이디 또는 이메일입니다.", success: "" };
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
  void form;
  return {
    error: "Google 관리자 가입은 이번 범위에서 제외되었습니다.",
    success: "",
  };
}
