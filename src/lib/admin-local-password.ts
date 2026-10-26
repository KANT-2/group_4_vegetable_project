import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

export const localAdminPasswordPath = () =>
  join(process.cwd(), "var", "admin", "credentials.json");
type Credential = { id: string; salt: string; hash: string };

export function readLocalAdminCredential(
  path = localAdminPasswordPath(),
): Credential | null {
  if (!existsSync(path)) return null;
  const data = JSON.parse(readFileSync(path, "utf8"));
  if (
    typeof data.id !== "string" ||
    !/^[a-f0-9]{32}$/.test(data.salt) ||
    !/^[a-f0-9]{128}$/.test(data.hash)
  )
    throw new Error("Invalid administrator credential file");
  return data;
}

export function matchesLocalAdminPassword(
  record: Credential,
  id: string,
  password: string,
) {
  return (
    record.id === id &&
    timingSafeEqual(
      Buffer.from(record.hash, "hex"),
      scryptSync(password, record.salt, 64),
    )
  );
}

export function writeLocalAdminPassword(
  id: string,
  password: string,
  path = localAdminPasswordPath(),
) {
  const salt = randomBytes(16).toString("hex");
  const record = {
    id,
    salt,
    hash: scryptSync(password, salt, 64).toString("hex"),
  };
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomBytes(8).toString("hex")}.tmp`;
  writeFileSync(temporary, JSON.stringify(record), { mode: 0o600 });
  renameSync(temporary, path);
}
