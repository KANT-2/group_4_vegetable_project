"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCustomerDemo, saveCustomerDemo } from "@/lib/customer-demo";
import { verifyCustomerDemoPassword } from "@/lib/customer-demo-password";

export async function customerDemoLogin(
  _previous: { error: string },
  form: FormData,
) {
  if (
    process.env.NODE_ENV !== "development" ||
    !verifyCustomerDemoPassword(
      String(form.get("id") ?? ""),
      String(form.get("password") ?? ""),
    )
  )
    return { error: "아이디 또는 비밀번호를 확인해 주세요." };
  await saveCustomerDemo({
    nickname: "qwer",
    name: "",
    email: "",
    phone: "",
    recipient: "",
    postalCode: "",
    address: "",
    addressDetail: "",
    expires: Date.now() + 3600000,
  });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateCustomerDemo(
  _previous: { error: string; success: string },
  form: FormData,
) {
  const profile = await getCustomerDemo();
  if (!profile) return { error: "다시 로그인해 주세요.", success: "" };
  const value = (key: string) => String(form.get(key) ?? "").trim();
  const next = {
    ...profile,
    nickname: value("name"),
    name: value("name"),
    email: value("email"),
    phone: value("phone"),
    recipient: value("recipient"),
    recipientPhone: value("recipientPhone"),
    postalCode: value("postalCode"),
    address: value("address"),
    addressDetail: value("addressDetail"),
  };
  if (!next.name || !next.email || !next.phone)
    return {
      error: "이름·이메일·휴대폰 번호를 모두 입력해 주세요.",
      success: "",
    };
  if (
    [next.name, next.recipient].some((value) => value.length > 60) ||
    next.address.length > 200 ||
    next.addressDetail.length > 100
  )
    return { error: "이름이나 주소가 너무 깁니다.", success: "" };
  if (
    next.email &&
    (next.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email))
  )
    return { error: "이메일 주소를 확인해 주세요.", success: "" };
  if (next.phone && !/^[0-9+() -]{8,20}$/.test(next.phone))
    return { error: "연락처를 확인해 주세요.", success: "" };
  if (next.recipientPhone && !/^[0-9+() -]{8,20}$/.test(next.recipientPhone))
    return { error: "배송지 연락처를 확인해 주세요.", success: "" };
  if (next.postalCode && !/^\d{5}$/.test(next.postalCode))
    return { error: "우편번호를 5자리 숫자로 입력해 주세요.", success: "" };
  try {
    await saveCustomerDemo(next);
  } catch {
    return {
      error: "입력 내용이 너무 깁니다. 내용을 줄여 주세요.",
      success: "",
    };
  }
  revalidatePath("/mypage");
  return { error: "", success: "회원 정보와 기본 배송지가 저장되었습니다." };
}
