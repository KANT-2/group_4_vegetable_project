"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/schemas/profile";
import { shippingSchema } from "@/schemas/shipping";
import type { ActionResult } from "@/types/action";

export async function updateProfile(
  input: unknown,
  expectedUserId: string,
): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const user = await requireUser();
  if (user.id !== expectedUserId)
    return {
      ok: false,
      error: "계정이 변경됐어요. 페이지를 새로고침해 주세요.",
    };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      nickname: parsed.data.nickname,
    });
    if (error) return { ok: false, error: "프로필을 저장하지 못했습니다." };
  } catch {
    return { ok: false, error: "프로필 서버에 연결할 수 없습니다." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveShippingAddress(
  input: unknown,
  expectedUserId: string,
): Promise<ActionResult> {
  const parsed = shippingSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0].message };
  const user = await requireUser();
  if (user.id !== expectedUserId)
    return {
      ok: false,
      error: "계정이 변경됐어요. 페이지를 새로고침해 주세요.",
    };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", user.id)
      .select("id")
      .single();
    if (error || !data)
      return {
        ok: false,
        error: "배송지를 저장하지 못했어요. 다시 시도해 주세요.",
      };
  } catch {
    return { ok: false, error: "배송지 서버에 연결할 수 없습니다." };
  }
  revalidatePath("/mypage");
  return { ok: true };
}

export async function clearShippingAddress(
  expectedUserId: string,
): Promise<ActionResult> {
  const user = await requireUser();
  if (user.id !== expectedUserId)
    return {
      ok: false,
      error: "계정이 변경됐어요. 페이지를 새로고침해 주세요.",
    };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        recipient_name: null,
        recipient_phone: null,
        postal_code: null,
        address: null,
        address_detail: null,
      })
      .eq("id", user.id)
      .select("id")
      .single();
    if (error || !data)
      return {
        ok: false,
        error: "배송지를 지우지 못했어요. 다시 시도해 주세요.",
      };
  } catch {
    return { ok: false, error: "배송지 서버에 연결할 수 없습니다." };
  }
  revalidatePath("/mypage");
  return { ok: true };
}
