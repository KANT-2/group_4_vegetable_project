import test from "node:test";
import assert from "node:assert/strict";
import { adminPasswordError } from "../src/lib/admin-password-validation.ts";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeLocalAdminPassword, readLocalAdminCredential, matchesLocalAdminPassword } from "../src/lib/admin-local-password.ts";

test("local administrator password persists as a salted hash and replacement rejects the old password", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "admin-password-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "credentials.json");
  assert.equal(readLocalAdminCredential(path), null);
  const old = "First+Password2026";
  const next = "Second+Password2026";
  writeLocalAdminPassword("admin", old, path);
  assert.equal(matchesLocalAdminPassword(readLocalAdminCredential(path), "admin", old), true);
  writeLocalAdminPassword("admin", next, path);
  const saved = readLocalAdminCredential(path);
  assert.equal(matchesLocalAdminPassword(saved, "admin", old), false);
  assert.equal(matchesLocalAdminPassword(saved, "admin", next), true);
  assert.equal(matchesLocalAdminPassword(saved, "other", next), false);
  const contents = await readFile(path, "utf8");
  assert.equal(contents.includes(next), false);
  assert.equal(contents.includes(old), false);
});

test("password change rejects missing, mismatching, unchanged and invalid new passwords", () => {
  const current = "Previous+Password1";
  const next = "New+Password2026";
  assert.equal(adminPasswordError(current, next, next), "");
  for (const values of [["", next, next], [current, "", ""], [current, next, "different"], [current, current, current], [current, "short", "short"], [current, "contains spaces here", "contains spaces here"], [current, "a".repeat(129), "a".repeat(129)]]) {
    assert.notEqual(adminPasswordError(...values), "");
  }
});
