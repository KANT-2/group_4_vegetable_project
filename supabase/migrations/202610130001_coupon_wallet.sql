begin;
create table public.coupon_campaigns (
  id text primary key,
  name text not null,
  discount_type text not null check (discount_type in ('fixed', 'percent')),
  discount_value integer not null check (discount_value > 0),
  minimum_amount integer not null check (minimum_amount >= 0),
  maximum_discount integer not null check (maximum_discount > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  valid_days integer not null check (valid_days between 1 and 30),
  eligible_vegetables text[] not null default '{}',
  first_purchase_only boolean not null default false,
  daily boolean not null default false,
  is_active boolean not null default true,
  check (ends_at > starts_at),
  check (discount_type <> 'percent' or discount_value <= 100)
);
create table public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id text not null references public.coupon_campaigns(id),
  issuance_day date not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  unique(user_id, campaign_id, issuance_day),
  check (expires_at > issued_at)
);
create index user_coupons_owner_expiry on public.user_coupons(user_id, expires_at);
alter table public.coupon_campaigns enable row level security;
alter table public.user_coupons enable row level security;
revoke all on public.coupon_campaigns, public.user_coupons from anon, authenticated;
grant select on public.coupon_campaigns to anon, authenticated;
grant select on public.user_coupons to authenticated;
create policy coupon_campaign_read on public.coupon_campaigns for select to anon, authenticated using (is_active);
create policy user_coupon_read_own on public.user_coupons for select to authenticated using (user_id = (select auth.uid()));

insert into public.coupon_campaigns(id,name,discount_type,discount_value,minimum_amount,maximum_discount,starts_at,ends_at,valid_days,eligible_vegetables,first_purchase_only,daily) values
('openrun-coupon','아침 장보기 쿠폰','fixed',2000,20000,2000,'2026-10-13 00:00:00+09','2026-12-01 00:00:00+09',1,'{}',false,true),
('first-box','첫 구매 10% 쿠폰','percent',10,30000,5000,'2026-10-13 00:00:00+09','2026-12-01 00:00:00+09',7,'{}',true,false),
('kimjang-coupon','김장 재료 15% 쿠폰','percent',15,40000,7000,'2026-10-13 00:00:00+09','2026-12-01 00:00:00+09',30,array['napa-cabbage','radish','onion'],false,false);

create function public.claim_coupon(p_campaign_id text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_campaign public.coupon_campaigns%rowtype;
  v_id uuid;
  v_day date;
  v_local timestamp := now() at time zone 'Asia/Seoul';
  v_expiry timestamptz;
begin
  if v_user is null then raise exception 'LOGIN_REQUIRED'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  select * into v_campaign from public.coupon_campaigns where id=p_campaign_id and is_active;
  if not found then raise exception 'INVALID_COUPON'; end if;
  if now() < v_campaign.starts_at or now() >= v_campaign.ends_at then raise exception 'CAMPAIGN_CLOSED'; end if;
  v_day := case when v_campaign.daily then v_local::date else (v_campaign.starts_at at time zone 'Asia/Seoul')::date end;
  select id into v_id from public.user_coupons where user_id=v_user and campaign_id=p_campaign_id and issuance_day=v_day;
  if found then return v_id; end if;
  if v_campaign.daily and (v_local::time < time '07:00' or v_local::time >= time '11:00') then raise exception 'ISSUANCE_TIME'; end if;
  if v_campaign.first_purchase_only and exists(select 1 from public.orders where user_id=v_user and status='paid') then raise exception 'FIRST_PURCHASE_ONLY'; end if;
  v_expiry := least(v_campaign.ends_at, case
    when v_campaign.daily then ((v_local::date + 1)::timestamp at time zone 'Asia/Seoul')
    when p_campaign_id='kimjang-coupon' then v_campaign.ends_at
    else now() + pg_catalog.make_interval(days => v_campaign.valid_days) end);
  insert into public.user_coupons(user_id,campaign_id,issuance_day,expires_at)
  values(v_user,p_campaign_id,v_day,v_expiry) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.claim_coupon(text) from public, anon;
grant execute on function public.claim_coupon(text) to authenticated;
commit;
