-- Existing recipes/RLS stay in place. Unstated facts are NULL, never invented.
begin;
alter table public.recipes alter column cook_time_min drop not null;
alter table public.recipes alter column difficulty drop not null;
alter table public.recipes add column source_url text
  check (source_url is null or source_url ~ '^https://');
alter table public.recipes add column source_name text;
alter table public.recipes add column vegetables jsonb not null default '[]'::jsonb
  check (jsonb_typeof(vegetables) = 'array');
commit;
