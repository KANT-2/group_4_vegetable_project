-- 관리자 가입 신청 전용. 가입은 관리자 권한(app_metadata.role)을 부여하지 않습니다.
-- 공유 DB에는 팀 검토 후 적용합니다. 기존 사용자/프로필 테이블은 변경하지 않습니다.
begin;

create table public.admin_registrations (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[!-~]{4,40}$'),
  username_key text generated always as (lower(username)) stored unique,
  email text not null check (char_length(email) between 3 and 254),
  email_key text generated always as (lower(btrim(email))) stored unique,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
alter table public.admin_registrations enable row level security;
revoke all on public.admin_registrations from anon, authenticated;
grant select, insert, update, delete on public.admin_registrations to service_role;

-- Auth 사용자 생성과 같은 트랜잭션: 동시 요청에도 UNIQUE 충돌 시 가입 전체 롤백.
create function public.capture_admin_registration()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ->> 'admin_signup' = 'true' then
    insert into public.admin_registrations (id, username, email, display_name)
    values (new.id, new.raw_user_meta_data ->> 'admin_username', new.email,
            new.raw_user_meta_data ->> 'admin_display_name');
  end if;
  return new;
end;
$$;
revoke all on function public.capture_admin_registration() from public, anon, authenticated;
create trigger capture_admin_registration after insert on auth.users
for each row execute function public.capture_admin_registration();

-- 인증된 이메일 변경도 고유 제약을 유지합니다. 메타데이터 변경으로 권한 부여 불가.
create function public.sync_admin_registration_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.admin_registrations set email = new.email where id = new.id;
  return new;
end;
$$;
revoke all on function public.sync_admin_registration_email() from public, anon, authenticated;
create trigger sync_admin_registration_email after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_admin_registration_email();

commit;
