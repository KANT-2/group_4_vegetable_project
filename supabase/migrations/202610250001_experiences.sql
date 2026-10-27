-- 체험 예약 (형준 담당). FastAPI(직접 Postgres 연결)가 사용하는 테이블이라 Data API 접근은 막아 둡니다.
-- user_id 의 외래키는 사용자 식별(app_users) 확정 후 별도 마이그레이션에서 추가합니다.
begin;

create table if not exists public.experiences (
  id text primary key,
  title text not null check (btrim(title) <> ''),
  description text not null default '',
  farm_name text not null,
  region text not null,
  fee integer not null default 0 check (fee >= 0),
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.experience_sessions (
  id uuid primary key default gen_random_uuid(),
  experience_id text not null references public.experiences(id) on delete cascade,
  starts_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'open' check (status in ('open', 'closed')),
  unique (experience_id, starts_at)
);

create table if not exists public.experience_reservations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.experience_sessions(id),
  user_id uuid not null,
  headcount integer not null check (headcount between 1 and 10),
  status text not null default 'reserved' check (status in ('reserved', 'cancelled')),
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

-- 같은 사용자의 같은 회차 활성 예약은 1건만 (취소 건 제외). 서비스 검사가 놓쳐도 DB가 막는다.
create unique index if not exists experience_reservations_one_active
  on public.experience_reservations (session_id, user_id) where status = 'reserved';
create index if not exists experience_reservations_user on public.experience_reservations (user_id);
create index if not exists experience_sessions_experience on public.experience_sessions (experience_id, starts_at);

alter table public.experiences enable row level security;
alter table public.experience_sessions enable row level security;
alter table public.experience_reservations enable row level security;
revoke all on table public.experiences, public.experience_sessions, public.experience_reservations
  from anon, authenticated;

commit;
