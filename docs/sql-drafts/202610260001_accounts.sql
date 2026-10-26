-- 지나: FastAPI 자체 회원·JWT 블랙리스트 초안.
-- 승인 전 초안이므로 supabase/migrations에 넣거나 팀 DB에 실행하지 않는다.
begin;

create table public.app_users (
  -- 기존 서비스 테이블과 같은 사용자 UUID를 쓰기 위해 auth.users를 식별 기준으로 유지한다.
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  supabase_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint app_users_email_normalized check (email = lower(btrim(email))),
  constraint app_users_email_not_blank check (char_length(email) between 3 and 320),
  constraint app_users_email_unique unique (email),
  constraint app_users_username_format check (username is null or username ~ '^[a-z0-9_.-]{4,40}$'),
  constraint app_users_identity_matches check (id = supabase_user_id)
);

create table public.revoked_tokens (
  jti text primary key check (char_length(jti) between 1 and 100),
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz not null default now()
);
create index revoked_tokens_user_id_idx on public.revoked_tokens(user_id);
create index revoked_tokens_expires_at_idx on public.revoked_tokens(expires_at);

create table public.admin_registrations (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_key text generated always as (lower(username)) stored unique,
  email text not null,
  email_key text generated always as (lower(btrim(email))) stored unique,
  display_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint admin_username_format check (username ~ '^[!-~]{4,40}$'),
  constraint admin_email_length check (char_length(email) between 3 and 254),
  constraint admin_display_name_length check (char_length(btrim(display_name)) between 1 and 60)
);
create index admin_registrations_status_idx on public.admin_registrations(status);

alter table public.app_users enable row level security;
alter table public.revoked_tokens enable row level security;
alter table public.admin_registrations enable row level security;
revoke all on table public.app_users, public.revoked_tokens, public.admin_registrations from public, anon, authenticated;
grant all on table public.app_users, public.revoked_tokens, public.admin_registrations to service_role;

commit;

-- 사용자 식별 합의:
-- profiles.id, cart_items.user_id, wishlist_items.user_id, orders.user_id,
-- user_coupons.user_id의 기존 auth.users(id) 외래키는 유지한다.
-- FastAPI JWT sub와 app_users.id도 같은 auth.users UUID를 사용한다.
