begin;

-- 주문 전체에 대한 환불 신청 한 건. 실제 PG 취소·환불 처리는 별도입니다.
create table public.refund_requests (
  order_id uuid primary key references public.orders(id) on delete cascade,
  reason text not null check (reason = btrim(reason) and char_length(reason) between 10 and 500),
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check ((status = 'requested' and reviewed_at is null) or (status <> 'requested' and reviewed_at is not null))
);

alter table public.refund_requests enable row level security;
revoke all on public.refund_requests from public, anon, authenticated;
grant select on public.refund_requests to authenticated;
grant insert (order_id, reason) on public.refund_requests to authenticated;
grant all on public.refund_requests to service_role;

create policy refund_requests_select_own on public.refund_requests
  for select to authenticated using (
    exists (select 1 from public.orders where orders.id = order_id and orders.user_id = (select auth.uid()))
  );
create policy refund_requests_insert_paid_own on public.refund_requests
  for insert to authenticated with check (
    status = 'requested' and reviewed_at is null and
    exists (select 1 from public.orders where orders.id = order_id
      and orders.user_id = (select auth.uid()) and orders.status = 'paid')
  );

commit;
