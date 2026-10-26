import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { adminSignupError } from "../src/lib/admin-signup-validation.ts";

const valid = {
  id: "Admin+One!",
  name: "김관리",
  email: "admin@example.com",
  password: "Abcdef123!xyZ",
  confirmPassword: "Abcdef123!xyZ",
};
test("signup validates missing data, confirmation and allows mixed-case symbols", () => {
  assert.equal(adminSignupError(valid), "");
  for (const key of Object.keys(valid))
    assert.notEqual(adminSignupError({ ...valid, [key]: "" }), "");
  assert.notEqual(
    adminSignupError({ ...valid, confirmPassword: "different" }),
    "",
  );
  assert.notEqual(adminSignupError({ ...valid, email: "bad" }), "");
  assert.notEqual(adminSignupError({ ...valid, id: "has space" }), "");
  assert.equal(
    adminSignupError({ ...valid, password: "", confirmPassword: "" }, true),
    "",
  );
});

test("database enforces unique ids and emails, permits same names, and rolls back duplicate signup", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610250002_admin_registrations.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const one = "00000000-0000-4000-8000-000000000001";
  const two = "00000000-0000-4000-8000-000000000002";
  const add = (id, username, email) =>
    db.query(
      `insert into auth.users(id, email, raw_user_meta_data) values ($1,$2,$3::jsonb)`,
      [
        id,
        email,
        JSON.stringify({
          admin_signup: true,
          admin_username: username,
          admin_display_name: "같은 이름",
        }),
      ],
    );
  await add(one, "Admin+One!", "One@example.com");
  await assert.rejects(
    add(two, "admin+one!", "two@example.com"),
    (error) => error.code === "23505",
  );
  assert.equal(
    (await db.query("select count(*)::int as n from auth.users")).rows[0].n,
    1,
  );
  await assert.rejects(
    add(two, "Admin+Two!", "ONE@example.com"),
    (error) => error.code === "23505",
  );
  await add(two, "Admin+Two!", "two@example.com");
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from public.admin_registrations where status='pending'",
      )
    ).rows[0].n,
    2,
  );
  await assert.rejects(
    db.query("update auth.users set email = 'ONE@example.com' where id = $1", [
      two,
    ]),
    (error) => error.code === "23505",
  );
  await db.exec("set role anon");
  await assert.rejects(
    db.query("select * from public.admin_registrations"),
    (error) => error.code === "42501",
  );
});
