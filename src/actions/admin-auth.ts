"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { adminRegistrationClient } from "@/lib/admin-registration-server";

export async function adminSignIn(
  _previous: { error: string },
  form: FormData,
) {
  const id = form.get("id");
  const password = form.get("password");
  if (
    typeof id !== "string" ||
    typeof password !== "string" ||
    id.length > 100 ||
    password.length > 200 ||
    !id.trim() ||
    !password
  )
    return { error: "아이디 또는 비밀번호를 확인해 주세요." };
  if (verifyAdminPassword(id.trim(), password)) {
    await createAdminSession();
    redirect("/admin");
  }
  try {
    const registry = adminRegistrationClient();
    const { data: registration, error } = await registry
      .from("admin_registrations")
      .select("email,status")
      .eq("username_key", id.trim().toLowerCase())
      .maybeSingle();
    if (error || !registration)
      return { error: "아이디 또는 비밀번호를 확인해 주세요." };
    const supabase = await createClient();
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: registration.email,
      password,
    });
    if (loginError || !data.user)
      return { error: "아이디 또는 비밀번호를 확인해 주세요." };
    if (
      registration.status !== "approved" ||
      data.user.app_metadata?.role !== "admin"
    ) {
      await supabase.auth.signOut();
      return { error: "관리자 승인 후 로그인할 수 있습니다." };
    }
  } catch {
    return {
      error:
        "로그인하지 못했습니다. 계정 정보 또는 로그인 연결 설정을 확인해 주세요.",
    };
  }
  redirect("/admin");
}

export async function adminSignOut() {
  if (getSupabaseConfig()) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error("Sign out failed");
    } catch {
      redirect("/admin?error=logout");
    }
  }
  await clearAdminSession();
  redirect("/admin/login");
}
