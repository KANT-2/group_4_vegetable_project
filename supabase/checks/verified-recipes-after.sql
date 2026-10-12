-- Read-only: run AFTER the migration and official seed.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'recipes'
  and column_name in ('source_url', 'source_name', 'vegetables', 'cook_time_min', 'difficulty')
order by column_name;

-- With the current official catalog: 16 / 213 / 72 / 16.
select count(*) as official_recipes,
       sum(jsonb_array_length(ingredients)) as ingredient_rows,
       sum(jsonb_array_length(steps)) as cooking_steps,
       count(*) filter (where source_url like 'https://%' and source_name is not null) as with_source
from public.recipes
where id like 'official-%';

select id, name, source_url, source_name, vegetables
from public.recipes
where id = 'official-sprout207811';

select relname, relrowsecurity
from pg_class
where oid in ('public.recipes'::regclass, 'public.recipe_products'::regclass);

-- Exercise the same public table/column access as the app's publishable client.
begin;
set local role anon;
select id, name, source_url, source_name, vegetables
from public.recipes
where id = 'official-sprout207811';
rollback;
