import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import catalog from "../src/data/generated/verified-recipes.json" with { type: "json" };
import { connectCatalogRecipes } from "../src/lib/recipe-catalog.ts";
import { products } from "../src/data/mock/products.ts";
import { vegetables } from "../src/data/mock/vegetables.ts";
import { parseRecipeFilters, recipeRowSchema } from "../src/schemas/recipe.ts";

test("공식 레시피의 출처·누락값·상품 없는 채소·말린 재료 구분을 유지한다", () => {
  const recipes = connectCatalogRecipes(catalog, products, vegetables);
  assert.equal(recipes.length, 16);
  assert.equal(
    recipes.filter((recipe) =>
      recipe.vegetables.some((vegetable) => vegetable.id === "paprika"),
    ).length,
    10,
  );
  assert.ok(
    recipes.some((recipe) =>
      recipe.products.some((product) => product.vegetableId === "paprika"),
    ),
  );
  assert.equal(
    recipes.reduce((sum, recipe) => sum + recipe.ingredients.length, 0),
    213,
  );
  assert.equal(
    recipes.reduce((sum, recipe) => sum + recipe.steps.length, 0),
    72,
  );
  for (const recipe of recipes) {
    assert.equal(recipe.cookTimeMin, null);
    assert.equal(recipe.difficulty, null);
    assert.match(
      recipe.sourceUrl,
      /^https:\/\/www\.(nongsaro\.go\.kr|foodsafetykorea\.go\.kr)\//,
    );
    assert.ok(
      recipe.products.every((product) =>
        recipe.vegetables.some(
          (vegetable) => vegetable.id === product.vegetableId,
        ),
      ),
    );
  }
  const dried = catalog.find((recipe) => recipe.name === "호박고지잡채");
  assert.ok(dried.vegetables.some((vegetable) => vegetable.name === "애호박"));
  assert.ok(!dried.productVegetableIds.includes("aehobak"));
  const withoutProducts = connectCatalogRecipes(catalog, [], []);
  assert.ok(
    withoutProducts.some((recipe) =>
      recipe.vegetables.some((vegetable) => vegetable.name === "가지"),
    ),
  );
  assert.deepEqual(
    parseRecipeFilters({ q: ["  샐러드 ", "무시"], vegetable: "bad/id" }),
    { q: "샐러드", vegetable: undefined },
  );
  assert.equal(
    recipeRowSchema.safeParse({
      ...catalog[0],
      cook_time_min: null,
      difficulty: null,
      servings: null,
      image_path: null,
      source_url: catalog[0].sourceUrl,
      source_name: catalog[0].sourceName,
      recipe_products: [],
    }).success,
    true,
  );
});

test("공통 DB에 공식 시드를 두 번 적용해도 중복·사용자 데이터 변경·공개 쓰기 권한이 생기지 않는다", async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    create schema storage; create table storage.buckets (id text primary key, name text not null, public boolean not null default false, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated, service_role; grant all on storage.objects to anon, authenticated, service_role;`);
  const migrations = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(migrations))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    if (file === "202610110001_verified_recipe_metadata.sql") {
      await db.exec(
        await readFile(
          new URL(
            "../supabase/checks/verified-recipes-preflight.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      // Reproduce the shared DB failure before the recipe metadata migration.
      await assert.rejects(db.query("select source_url from public.recipes"), {
        code: "42703",
      });
    }
    await db.exec(await readFile(new URL(file, migrations), "utf8"));
  }
  const metadataColumns = (
    await db.query(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes'
      and column_name in ('source_url', 'source_name', 'vegetables', 'cook_time_min', 'difficulty')
    order by column_name
  `)
  ).rows;
  assert.equal(metadataColumns.length, 5);
  assert.ok(
    metadataColumns.every(
      (column) =>
        column.is_nullable ===
        (column.column_name === "vegetables" ? "NO" : "YES"),
    ),
  );
  assert.equal(
    metadataColumns.find((column) => column.column_name === "vegetables")
      .data_type,
    "jsonb",
  );
  await db.exec(
    await readFile(
      new URL("../supabase/seeds/catalog.sql", import.meta.url),
      "utf8",
    ),
  );
  const before = (await db.query("select * from public.products order by id"))
    .rows;
  await db.exec(
    `insert into public.recipes (id, name, description, cook_time_min, difficulty) values ('existing', '기존 자료', '보존', 10, 'easy');`,
  );
  const seed = await readFile(
    new URL("../supabase/seeds/verified-recipes.sql", import.meta.url),
    "utf8",
  );
  await db.exec(seed);
  const officialTotals = (
    await db.query(`
    select count(*)::int as recipes,
      sum(jsonb_array_length(ingredients))::int as ingredients,
      sum(jsonb_array_length(steps))::int as steps
    from public.recipes where id like 'official-%'
  `)
  ).rows[0];
  assert.deepEqual(officialTotals, {
    recipes: 16,
    ingredients: 213,
    steps: 72,
  });
  const firstLinks = (
    await db.query(
      "select * from public.recipe_products order by recipe_id, product_id",
    )
  ).rows;
  await db.exec(seed);
  assert.deepEqual(
    (
      await db.query(
        "select * from public.recipe_products order by recipe_id, product_id",
      )
    ).rows,
    firstLinks,
  );
  assert.deepEqual(
    (await db.query("select * from public.products order by id")).rows,
    before,
  );
  assert.equal(
    (await db.query("select count(*)::int as n from public.recipes")).rows[0].n,
    17,
  );
  assert.equal(
    (await db.query("select name from public.recipes where id = 'existing'"))
      .rows[0].name,
    "기존 자료",
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as n from public.recipes where id like 'official-%' and cook_time_min is null and difficulty is null",
      )
    ).rows[0].n,
    16,
  );
  await db.exec(
    await readFile(
      new URL("../supabase/checks/verified-recipes-after.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec("set role anon");
  assert.equal(
    (await db.query("select count(*)::int as n from public.recipes")).rows[0].n,
    17,
  );
  await assert.rejects(
    db.exec("update public.recipes set name = '변경' where id = 'existing'"),
  );
});
