import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const user1 = "00000000-0000-4000-8000-000000000001";
const user2 = "00000000-0000-4000-8000-000000000002";
const order1 = "00000000-0000-4000-8000-000000000011";
const order2 = "00000000-0000-4000-8000-000000000012";
const requestKey = "00000000-0000-4000-8000-000000000021";

test("공통 migration의 제약 조건과 RLS를 PostgreSQL에서 검증한다", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());

  // 테스트 DB에만 Supabase 역할·Auth 최소 환경을 구성합니다.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    insert into auth.users values ('${user1}'), ('${user2}');
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role;
    grant all on storage.objects to anon, authenticated, service_role;
    -- 다른 bucket에 포괄 쓰기 정책이 있어도 market-images의 쓰기가 차단되는지 검증합니다.
    create policy fixture_allow_objects on storage.objects for all to anon, authenticated using (true) with check (true);
  `);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(migrations))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }

  await db.exec(`
    insert into public.vegetables (id, name, category, description)
      values ('carrot', '테스트 당근', 'root', '테스트');
    insert into public.products (id, vegetable_id, name, price, original_price, unit, ugly_reason, description, farm_name, is_active)
      values ('test-carrot', 'carrot', '테스트 상품', 1000, 2000, '1kg', 'bent', '테스트', '가상 농가', true),
             ('test-hidden', 'carrot', '판매 종료', 1000, 2000, '1kg', 'small', '테스트', '가상 농가', false);
    insert into public.recipes (id, name, description, cook_time_min, difficulty)
      values ('carrot-salad', '테스트 샐러드', '테스트', 10, 'easy');
    insert into public.recipe_products values ('carrot-salad', 'test-carrot');
    insert into public.profiles (id, nickname, updated_at)
      values ('${user1}', '회원하나', '2000-01-01'), ('${user2}', '회원둘', '2000-01-01');
    insert into public.cart_items (user_id, product_id) values ('${user2}', 'test-carrot');
    insert into public.wishlist_items (user_id, product_id) values ('${user2}', 'test-carrot');
    insert into public.orders (id, user_id, request_key, total_amount, recipient_name, recipient_phone, postal_code, address)
      values ('${order1}', '${user1}', '${requestKey}', 1000, '회원하나', '01012345678', '01234', '테스트 주소'),
             ('${order2}', '${user2}', '${requestKey}', 1000, '회원둘', '01012345678', '01234', '테스트 주소');
    insert into public.order_items (order_id, product_id, product_name, product_unit, unit_price, quantity)
      values ('${order1}', 'test-carrot', '주문 당시 이름', '1kg', 1000, 1),
             ('${order2}', 'test-carrot', '주문 당시 이름', '1kg', 1000, 1);
  `);

  async function asRole(role, user = "") {
    assert.ok(["anon", "authenticated", "service_role"].includes(role));
    await db.exec(`reset role; set role ${role};`);
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      user,
    ]);
  }

  await t.test("9개 테이블에 RLS가 활성화된다", async () => {
    const { rows } = await db.query(
      "select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity",
    );
    assert.equal(rows.length, 9);
  });

  await t.test("가격·수량·JSON·주문 상태·외래 키를 검증한다", async () => {
    for (const sql of [
      "update public.products set price = 0 where id = 'test-carrot'",
      "update public.products set original_price = 999 where id = 'test-carrot'",
      "update public.vegetables set category = 'invalid' where id = 'carrot'",
      "update public.recipes set ingredients = '{}'::jsonb where id = 'carrot-salad'",
      "update public.cart_items set quantity = 0",
      "update public.cart_items set quantity = 100",
      `update public.orders set status = 'paid' where id = '${order1}'`,
      `update public.orders set paid_at = now() where id = '${order1}'`,
      `update public.orders set postal_code = '1234' where id = '${order1}'`,
      `update public.order_items set unit_price = -1 where order_id = '${order1}'`,
    ]) {
      await assert.rejects(db.query(sql), { code: "23514" });
    }
    await assert.rejects(
      db.query(
        "update public.products set vegetable_id = 'missing' where id = 'test-carrot'",
      ),
      { code: "23503" },
    );
    await assert.rejects(
      db.query("delete from public.products where id = 'test-carrot'"),
      (error) =>
        ["23503", "23001"].includes(error.code) &&
        error.constraint === "order_items_product_id_fkey",
    );
    await assert.rejects(
      db.query(
        `insert into public.orders (user_id, request_key, total_amount, recipient_name, recipient_phone, postal_code, address) values ('${user1}', '${requestKey}', 1000, '회원', '01012345678', '01234', '주소')`,
      ),
      { code: "23505" },
    );
  });

  await t.test(
    "비로그인은 공개 콘텐츠만 읽고 판매 종료 상품은 보지 못한다",
    async () => {
      await asRole("anon");
      assert.deepEqual(
        (await db.query("select id from public.products")).rows,
        [{ id: "test-carrot" }],
      );
      for (const table of ["vegetables", "recipes", "recipe_products"]) {
        assert.equal(
          (await db.query(`select * from public.${table}`)).rows.length,
          1,
        );
      }
      for (const table of [
        "profiles",
        "cart_items",
        "wishlist_items",
        "orders",
        "order_items",
      ]) {
        await assert.rejects(db.query(`select * from public.${table}`), {
          code: "42501",
        });
      }
      await assert.rejects(db.query("update public.products set price = 1"), {
        code: "42501",
      });
    },
  );

  await t.test("본인 프로필만 수정하고 수정 시각이 자동 갱신된다", async () => {
    await asRole("authenticated", user1);
    assert.equal(
      (await db.query("select * from public.profiles")).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "update public.profiles set nickname = '탈취시도' where id = $1 returning id",
          [user2],
        )
      ).rows.length,
      0,
    );
    const { rows } = await db.query(
      "update public.profiles set nickname = '새닉네임' where id = $1 returning nickname, updated_at",
      [user1],
    );
    assert.equal(rows[0].nickname, "새닉네임");
    assert.ok(rows[0].updated_at > new Date("2000-01-01"));
    await assert.rejects(
      db.query("update public.profiles set id = $1 where id = $2", [
        user2,
        user1,
      ]),
      { code: "42501" },
    );
    await assert.rejects(db.query("delete from public.profiles"), {
      code: "42501",
    });
  });

  await t.test(
    "장바구니·찜은 본인만 변경하고 중복 항목을 거부한다",
    async () => {
      await asRole("authenticated", user1);
      assert.equal(
        (await db.query("select * from public.cart_items")).rows.length,
        0,
      );
      await db.query(
        "insert into public.cart_items (product_id, quantity) values ('test-carrot', 2)",
      );
      await assert.rejects(
        db.query(
          "insert into public.cart_items (product_id) values ('test-carrot')",
        ),
        { code: "23505" },
      );
      await assert.rejects(
        db.query(
          "insert into public.cart_items (user_id, product_id) values ($1, 'test-carrot')",
          [user2],
        ),
        { code: "42501" },
      );
      assert.equal(
        (
          await db.query(
            "update public.cart_items set quantity = 5 where user_id = $1 returning id",
            [user2],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query("update public.cart_items set user_id = $1", [user2]),
        { code: "42501" },
      );
      await db.query(
        "insert into public.wishlist_items (product_id) values ('test-carrot')",
      );
      await assert.rejects(
        db.query(
          "insert into public.wishlist_items (product_id) values ('test-carrot')",
        ),
        { code: "23505" },
      );
      await assert.rejects(
        db.query(
          "insert into public.wishlist_items (user_id, product_id) values ($1, 'test-hidden')",
          [user2],
        ),
        { code: "42501" },
      );
      await assert.rejects(
        db.query("update public.wishlist_items set product_id = 'test-hidden'"),
        { code: "42501" },
      );
      assert.equal(
        (
          await db.query(
            "delete from public.wishlist_items where user_id = $1 returning id",
            [user2],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (await db.query("delete from public.wishlist_items returning id")).rows
          .length,
        1,
      );
      assert.equal(
        (await db.query("delete from public.cart_items returning id")).rows
          .length,
        1,
      );
      await asRole("authenticated", user2);
      assert.equal(
        (await db.query("select * from public.cart_items")).rows.length,
        1,
      );
      assert.equal(
        (await db.query("select * from public.wishlist_items")).rows.length,
        1,
      );
    },
  );

  await t.test(
    "주문은 본인만 읽고 일반 사용자의 가격·결제 상태 변경은 차단한다",
    async () => {
      for (const [user, order] of [
        [user1, order1],
        [user2, order2],
      ]) {
        await asRole("authenticated", user);
        assert.deepEqual(
          (await db.query("select id from public.orders")).rows,
          [{ id: order }],
        );
        assert.deepEqual(
          (await db.query("select order_id from public.order_items")).rows,
          [{ order_id: order }],
        );
        await assert.rejects(
          db.query("insert into public.orders (user_id) values ($1)", [user]),
          { code: "42501" },
        );
        await assert.rejects(
          db.query("update public.orders set total_amount = 1"),
          { code: "42501" },
        );
        await assert.rejects(
          db.query("update public.order_items set unit_price = 1"),
          { code: "42501" },
        );
        await assert.rejects(db.query("delete from public.orders"), {
          code: "42501",
        });
      }
      await asRole("service_role");
      await db.query(
        "update public.products set price = 1500 where id = 'test-carrot'",
      );
      assert.equal(
        (
          await db.query(
            "select unit_price from public.order_items where order_id = $1",
            [order1],
          )
        ).rows[0].unit_price,
        1000,
      );
      await db.query(
        "update public.orders set status = 'paid', paid_at = now() where id = $1",
        [order1],
      );
    },
  );

  await t.test(
    "Storage는 공개 이미지 bucket을 구성하고 일반 사용자 쓰기는 차단한다",
    async () => {
      await db.exec("reset role");
      assert.equal(
        (
          await db.query(
            "select public from storage.buckets where id = 'market-images'",
          )
        ).rows[0].public,
        true,
      );
      await db.exec(
        "insert into storage.objects (bucket_id, name) values ('market-images', 'products/fixture.jpg')",
      );
      for (const role of ["anon", "authenticated"]) {
        await asRole(role, role === "authenticated" ? user1 : "");
        await assert.rejects(
          db.query(
            "insert into storage.objects (bucket_id,name) values ('market-images','products/new.jpg')",
          ),
          { code: "42501" },
        );
        assert.equal(
          (
            await db.query(
              "update storage.objects set name = 'changed.jpg' where bucket_id = 'market-images' returning id",
            )
          ).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "delete from storage.objects where bucket_id = 'market-images' returning id",
            )
          ).rows.length,
          0,
        );
      }
      await db.exec("reset role");
      assert.equal(
        (await db.query("select count(*)::int as count from storage.objects"))
          .rows[0].count,
        1,
      );
    },
  );

  await t.test("B catalog seed는 두 번 실행해도 중복되지 않는다", async () => {
    await db.exec("reset role");
    const seed = await readFile(
      new URL("../supabase/seeds/catalog.sql", import.meta.url),
      "utf8",
    );
    await db.exec(seed);
    await db.exec(seed);
    const { rows } = await db.query(
      "select (select count(*)::int from vegetables) as vegetables, (select count(*)::int from products) as products",
    );
    // 기존 fixture 상품 2개 + B 상품 67개. carrot 채소는 ID가 같아 덮어씁니다.
    assert.deepEqual(rows[0], { vegetables: 21, products: 69 });
  });
});
