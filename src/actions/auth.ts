"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema } from "@/schemas/auth";
import { safeNextPath } from "@/lib/redirect";
import type { ActionResult } from "@/types/action";
import { googleCallbackUrl } from "@/lib/auth-urls";
import { requireSupabaseConfig } from "@/lib/supabase/config";
import { getGoogleLoginStatus } from "@/services/auth-settings";

export async function signInWithGoogle(next: string): Promise<ActionResult> {
  let authorizeUrl: string;
  try {
    const status = await getGoogleLoginStatus();
    if (!status.ready) return { ok: false, error: status.message };
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: googleCallbackUrl(
          process.env.NEXT_PUBLIC_SITE_URL,
          typeof next === "string" ? next : undefined,
        ),
        scopes: "openid email profile",
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) throw new Error("oauth unavailable");
    const url = new URL(data.url);
    if (
      url.origin !== new URL(requireSupabaseConfig().url).origin ||
      url.pathname !== "/auth/v1/authorize"
    )
      throw new Error("unexpected oauth destination");
    authorizeUrl = url.toString();
  } catch {
    return {
      ok: false,
      error: "Google 로그인에 연결하지 못했어요. 다시 시도해 주세요.",
    };
  }
  redirect(authorizeUrl);
}

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error)
      return {
        ok: false,
        error: "로그인하지 못했습니다. 이메일과 비밀번호를 확인해주세요.",
      };
  } catch {
    return {
      ok: false,
      error: "로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeNextPath(parsed.data.next));
}

export async function signOut(returnToHome = true): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error)
      return {
        ok: false,
        error: "로그아웃하지 못했습니다. 다시 시도해주세요.",
      };
  } catch {
    return {
      ok: false,
      error: "로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  revalidatePath("/", "layout");
  // 프론트에서 별도 Context를 사용한다면 로그아웃할 때 그 상태도 초기화합니다.
  if (returnToHome) redirect("/", "replace");
  return { ok: true };
}
