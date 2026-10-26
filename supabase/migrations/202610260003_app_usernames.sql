-- 일반 회원의 아이디·이메일 통합 로그인을 위한 고유 아이디.
begin;

alter table public.app_users add column if not exists username text;

with candidates as (
  select
    id,
    lower(split_part(email, '@', 1)) as candidate,
    row_number() over (
      partition by lower(split_part(email, '@', 1)) order by created_at, id
    ) as candidate_order
  from public.app_users
  where username is null
)
update public.app_users as users
set username = case
  when candidates.candidate ~ '^[a-z0-9_.-]{4,40}$'
       and candidates.candidate_order = 1
    then candidates.candidate
  else 'user_' || left(replace(users.id::text, '-', ''), 12)
end
from candidates
where users.id = candidates.id;

alter table public.app_users
  add constraint app_users_username_format
  check (username is null or username ~ '^[a-z0-9_.-]{4,40}$');

create unique index app_users_username_key
  on public.app_users (lower(username))
  where username is not null;

commit;
