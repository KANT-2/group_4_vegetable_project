import "server-only";
import { requireUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { fastApi, type FastApiUser } from "@/lib/fastapi";

export async function getProfile() {
  const user = await requireUser();
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) throw new Error("로그인이 필요합니다.");
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
