import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("쿠폰은 서버 조건·중복 방지·본인 조회·직접 쓰기 차단을 적용한다", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  const one = "00000000-0000-4000-8000-000000000001";
  const two = "00000000-0000-4000-8000-000000000002";
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated;
    insert into auth.users values ('${one}'),('${two}');
    create table public.orders(user_id uuid,status text);`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610130001_coupon_wallet.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  // 테스트 날짜에 의존하지 않도록 DB 현재 시각을 기준으로 발급 기간을 설정합니다.
  await db.exec(
    "update public.coupon_campaigns set starts_at=now()-interval '1 day', ends_at=now()+interval '30 days'",
  );
  const role = async (user, name = "authenticated") => {
    await db.exec(`reset role; set role ${name}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user,
    ]);
  };
  await role("", "anon");
  await assert.rejects(
    db.query("select public.claim_coupon('kimjang-coupon')"),
    /permission denied/,
  );
  await role(one);
  const first = (
    await db.query("select public.claim_coupon('kimjang-coupon') as id")
  ).rows[0].id;
  const repeated = (
    await db.query("select public.claim_coupon('kimjang-coupon') as id")
  ).rows[0].id;
  assert.equal(first, repeated);
  assert.equal(
    (await db.query("select * from public.user_coupons")).rows.length,
    1,
  );
  await assert.rejects(
    db.query(
      "insert into public.user_coupons(user_id,campaign_id,issuance_day,expires_at) values ($1,'first-box',current_date,now()+interval '1 day')",
      [one],
    ),
    /permission denied/,
  );
  await assert.rejects(
    db.query(
      "update public.user_coupons set expires_at=now()+interval '1 year'",
    ),
    /permission denied/,
  );
  await role(two);
  assert.equal(
    (await db.query("select * from public.user_coupons")).rows.length,
    0,
  );
  await db.query("select public.claim_coupon('first-box')");
  await db.exec("reset role");
  await db.query("insert into public.orders values ($1,'paid')", [one]);
  await role(one);
  await assert.rejects(
    db.query("select public.claim_coupon('first-box')"),
    /FIRST_PURCHASE_ONLY/,
  );
  await assert.rejects(
    db.query("select public.claim_coupon('unknown')"),
    /INVALID_COUPON/,
  );
  await db.exec(
    "reset role; update public.coupon_campaigns set starts_at=now()-interval '10 days',ends_at=now()-interval '1 day' where id='kimjang-coupon'",
  );
  await role(two);
  await assert.rejects(
    db.query("select public.claim_coupon('kimjang-coupon')"),
    /CAMPAIGN_CLOSED/,
  );
  await db.exec("reset role");
  const period = (
    await db.query(
      "select (now() at time zone 'Asia/Seoul')::time >= time '07:00' and (now() at time zone 'Asia/Seoul')::time < time '11:00' as allowed",
    )
  ).rows[0].allowed;
  await role(one);
  if (!period)
    await assert.rejects(
      db.query("select public.claim_coupon('openrun-coupon')"),
      /ISSUANCE_TIME/,
    );
  else {
    await db.query("select public.claim_coupon('openrun-coupon')");
    const rows = (
      await db.query(
        "select expires_at from public.user_coupons where campaign_id='openrun-coupon'",
      )
    ).rows;
    assert.equal(rows.length, 1);
  }
});
