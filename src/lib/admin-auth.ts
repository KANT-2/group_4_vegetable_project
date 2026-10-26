import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookie";
import { fastApi, type FastApiUser } from "@/lib/fastapi";
import {
  readLocalAdminCredential,
  matchesLocalAdminPassword,
  writeLocalAdminPassword,
} from "@/lib/admin-local-password";

const name = "motnani-admin";
const runtime = globalThis as typeof globalThis & { adminKey?: string };
function key() {
  const base =
    process.env.ADMIN_SESSION_SECRET ||
    (process.env.NODE_ENV === "development"
      ? (runtime.adminKey ??= randomBytes(48).toString("hex"))
      : null);
  if (!base) return null;
  const credential =
    process.env.NODE_ENV === "development" ? readLocalAdminCredential() : null;
  // 비밀번호 변경 전에 발급된 모든 임시 계정 세션을 무효화합니다.
  return credential
    ? createHmac("sha256", base).update(credential.hash).digest("hex")
    : base;
}
export function verifyAdminPassword(id: string, password: string) {
  const local = process.env.NODE_ENV === "development";
  const expectedId = process.env.ADMIN_LOGIN_ID || (local ? "admin" : "");
  const expectedPassword =
    process.env.ADMIN_LOGIN_PASSWORD || (local ? "admin1234" : "");
  const secret = key();
  if (!secret || !expectedId || !expectedPassword) return false;
  if (id !== expectedId) return false;
  const credential = local ? readLocalAdminCredential() : null;
  if (credential) return matchesLocalAdminPassword(credential, id, password);
  const hash = (value: string) =>
    createHmac("sha256", secret).update(value).digest();
  return timingSafeEqual(
    hash(JSON.stringify([id, password])),
    hash(JSON.stringify([expectedId, expectedPassword])),
  );
}

export function changeLocalAdminPassword(current: string, password: string) {
  if (process.env.NODE_ENV !== "development") return false;
  const id = process.env.ADMIN_LOGIN_ID || "admin";
  if (!verifyAdminPassword(id, current)) return false;
  writeLocalAdminPassword(id, password);
  return true;
}
export async function createAdminSession() {
  const secret = key();
  if (!secret) throw new Error("관리자 인증 설정이 필요합니다.");
  const expires = String(Date.now() + 3600000);
  const signature = createHmac("sha256", secret).update(expires).digest("hex");
  (await cookies()).set(name, `${expires}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 3600,
  });
}
export async function clearAdminSession() {
  (await cookies()).set(name, "", { path: "/admin", maxAge: 0 });
  (await cookies()).set("motnani-admin-profile", "", {
    path: "/admin",
    maxAge: 0,
  });
}

export async function saveSessionAdminProfile(profile: {
  name: string;
  email: string;
}) {
  if (!(await hasPasswordSession())) throw new Error("unauthorized");
  const secret = key();
  if (!secret) throw new Error("not configured");
  const session = (await cookies()).get(name)?.value;
  const body = Buffer.from(JSON.stringify({ ...profile, session })).toString(
    "base64url",
  );
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  (await cookies()).set("motnani-admin-profile", `${body}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 3600,
  });
}

export async function getSessionAdminProfile(): Promise<{
  name: string;
  email: string;
} | null> {
  if (!(await hasPasswordSession())) return null;
  const secret = key();
  const value = (await cookies()).get("motnani-admin-profile")?.value;
  if (!secret || !value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature || !/^[a-f0-9]{64}$/.test(signature)) return null;
  if (
    !timingSafeEqual(
      Buffer.from(signature, "hex"),
      createHmac("sha256", secret).update(body).digest(),
    )
  )
    return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    if (
      data.session !== (await cookies()).get(name)?.value ||
      typeof data.name !== "string" ||
      typeof data.email !== "string"
    )
      return null;
    return { name: data.name, email: data.email };
  } catch {
    return null;
  }
}
export async function hasPasswordSession() {
  const value = (await cookies()).get(name)?.value;
  const secret = key();
  if (!value || !secret) return false;
  const parts = value.split(".");
  if (
    parts.length !== 2 ||
    !/^\d+$/.test(parts[0]) ||
    Number(parts[0]) <= Date.now() ||
    !/^[a-f0-9]{64}$/.test(parts[1])
  )
    return false;
  return timingSafeEqual(
    Buffer.from(parts[1], "hex"),
    createHmac("sha256", secret).update(parts[0]).digest(),
  );
}
export async function getAdminAccess() {
  if (await hasPasswordSession()) return { allowed: true, signedIn: true };
  const user = await getCurrentUser();
  if (!user) return { allowed: false, signedIn: false };
  const token = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return { allowed: false, signedIn: true };
  try {
    const me = await fastApi<FastApiUser>("/api/v1/accounts/me", {}, token);
    return { allowed: me.role === "admin", signedIn: true };
  } catch {
    return { allowed: false, signedIn: true };
  }
}
