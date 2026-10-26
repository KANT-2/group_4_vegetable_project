import { createHmac, timingSafeEqual } from "node:crypto";

export const customerDemoCookie = "motnani-customer-demo";
export type CustomerDemoProfile = {
  recipientPhone?: string;
  nickname: string;
  name: string;
  email: string;
  phone: string;
  recipient: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  expires: number;
};
function secret() {
  // 개발 전용 UI 시연 세션이며 실제 사용자 API의 인증으로 사용하지 않습니다.
  return process.env.NODE_ENV === "development"
    ? process.env.CUSTOMER_DEMO_SECRET || "motnani-local-customer-preview-only"
    : null;
}
export function encodeCustomerDemo(profile: CustomerDemoProfile) {
  const key = secret();
  if (!key) throw new Error("Demo login is development-only");
  const body = Buffer.from(JSON.stringify(profile)).toString("base64url");
  if (body.length > 3000) throw new Error("Demo profile too large");
  return `${body}.${createHmac("sha256", key).update(body).digest("hex")}`;
}
export function decodeCustomerDemo(value?: string): CustomerDemoProfile | null {
  const key = secret();
  if (!value || !key) return null;
  const [body, signature, extra] = value.split(".");
  if (
    !body ||
    extra ||
    body.length > 3000 ||
    !/^[a-f0-9]{64}$/.test(signature ?? "")
  )
    return null;
  if (
    !timingSafeEqual(
      Buffer.from(signature, "hex"),
      createHmac("sha256", key).update(body).digest(),
    )
  )
    return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof data.expires !== "number" || data.expires <= Date.now())
      return null;
    for (const field of [
      "nickname",
      "name",
      "email",
      "phone",
      "recipient",
      "postalCode",
      "address",
      "addressDetail",
    ]) {
      if (typeof data[field] !== "string") return null;
    }
    return data;
  } catch {
    return null;
  }
}
