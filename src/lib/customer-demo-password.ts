import { join } from "node:path";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  matchesLocalAdminPassword,
  readLocalAdminCredential,
  writeLocalAdminPassword,
} from "./admin-local-password.ts";

const credentialPath = () =>
  join(process.cwd(), "var", "customer-demo", "credentials.json");
export function verifyCustomerDemoPassword(id: string, password: string) {
  if (
    process.env.NODE_ENV !== "development" ||
    id !== "qwer" ||
    password.length > 200
  )
    return false;
  const record = readLocalAdminCredential(credentialPath());
  if (record) return matchesLocalAdminPassword(record, id, password);
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(password), digest("qwer1234"));
}
export function changeCustomerDemoPassword(current: string, password: string) {
  if (!verifyCustomerDemoPassword("qwer", current)) return false;
  writeLocalAdminPassword("qwer", password, credentialPath());
  return true;
}
