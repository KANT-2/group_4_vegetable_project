-- FastAPI 자체 회원(app_users)·JWT 블랙리스트(revoked_tokens). 작성: 지나, 정식 반영·적용: 형준(2026-10-26).
-- 기존 테이블은 변경하지 않는다. profiles·cart_items 등의 외래키 교체는 별도 합의 후 별도 마이그레이션으로 처리한다.
begin;

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  supabase_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint app_users_email_normalized check (email = lower(btrim(email))),
  constraint app_users_email_not_blank check (char_length(email) between 3 and 320),
  constraint app_users_email_unique unique (email)
);

create table public.revoked_tokens (
  jti text primary key check (char_length(jti) between 1 and 100),
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  revoked_at timestamptz not null default now()
);
create index revoked_tokens_user_id_idx on public.revoked_tokens(user_id);
create index revoked_tokens_expires_at_idx on public.revoked_tokens(expires_at);

alter table public.app_users enable row level security;
alter table public.revoked_tokens enable row level security;
revoke all on table public.app_users, public.revoked_tokens from public, anon, authenticated;
grant all on table public.app_users, public.revoked_tokens to service_role;

commit;

-- 후속 팀 합의 항목:
-- profiles.id, cart_items.user_id, wishlist_items.user_id, orders.user_id,
-- user_coupons.user_id를 app_users.id로 바꿀지와 auth.uid() 기반 RLS·RPC를
-- FastAPI 방식으로 교체할지 확정한다.
