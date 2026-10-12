-- Read-only: run BEFORE the recipe migration in the TEAM project's SQL Editor.
select current_database() as database_name,
       to_regclass('public.recipes') as recipes_table;

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'recipes'
  and column_name in ('source_url', 'source_name', 'vegetables', 'cook_time_min', 'difficulty')
order by column_name;

-- Missing all three metadata columns: apply the original migration once.
-- All three exist: verify text/text/jsonb, vegetables NOT NULL, others nullable.
-- Partial or incompatible schema: stop; do not blindly re-run or reset the DB.
