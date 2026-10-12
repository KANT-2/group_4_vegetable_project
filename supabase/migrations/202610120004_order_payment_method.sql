-- 모의 결제 전용: 실제 결제/배송을 수행하지 않습니다.
-- 가격·상품·배송지 검증과 주문 저장·장바구니 정리를 한 트랜잭션에서 처리합니다.
begin;
alter table public.orders add column payment_method text
  check (payment_method in ('card', 'bank_transfer', 'easy_pay'));

create or replace function public.mock_checkout(p_request_key uuid, p_shipping jsonb, p_expected_items jsonb, p_success boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_method text := coalesce(p_shipping->>'payment_method', 'card');
  v_id uuid;
  v_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_row record;
begin
  if v_user is null or p_request_key is null or p_success is null then
    raise exception 'LOGIN_REQUIRED';
  end if;
  if v_method not in ('card', 'bank_transfer', 'easy_pay') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;
  -- 동일 계정의 주문 요청을 직렬화하고 재전송에는 기존 주문을 반환합니다.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  select id into v_id from public.orders where user_id=v_user and request_key=p_request_key;
  if found then return v_id; end if;

  if p_shipping is null
    or coalesce(length(btrim(p_shipping->>'recipient_name')), 0) not between 2 and 40
    or coalesce(p_shipping->>'recipient_phone', '') !~ '^0[0-9]{8,10}$'
    or coalesce(p_shipping->>'postal_code', '') !~ '^[0-9]{5}$'
    or coalesce(length(btrim(p_shipping->>'address')), 0) not between 5 and 200
    or length(coalesce(p_shipping->>'address_detail','')) > 100 then
    raise exception 'INVALID_SHIPPING';
  end if;

  for v_row in
    select c.product_id, c.quantity, p.price, p.name, p.unit, p.is_active
    from public.cart_items c join public.products p on p.id=c.product_id
    where c.user_id=v_user order by c.product_id
    for update of c for share of p
  loop
    if not v_row.is_active then raise exception 'CART_CHANGED'; end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_row.product_id, 'quantity', v_row.quantity, 'unit_price', v_row.price));
    v_total := v_total + v_row.price::bigint * v_row.quantity;
  end loop;
  if v_total = 0 then raise exception 'EMPTY_CART'; end if;
  if p_expected_items is null or v_items <> p_expected_items then raise exception 'CART_CHANGED'; end if;

  insert into public.orders(user_id, request_key, status, total_amount, recipient_name, recipient_phone, postal_code, address, address_detail, paid_at, payment_method)
  values(v_user, p_request_key, case when p_success then 'paid' else 'payment_failed' end, v_total,
    btrim(p_shipping->>'recipient_name'), p_shipping->>'recipient_phone', p_shipping->>'postal_code',
    btrim(p_shipping->>'address'), btrim(coalesce(p_shipping->>'address_detail','')),
    case when p_success then now() else null end, v_method)
  returning id into v_id;
  insert into public.order_items(order_id, product_id, product_name, product_unit, unit_price, quantity)
  select v_id, c.product_id, p.name, p.unit, p.price, c.quantity
    from public.cart_items c join public.products p on p.id=c.product_id
    where c.user_id=v_user and c.product_id in (select item->>'product_id' from jsonb_array_elements(v_items) item);
  if p_success then
    delete from public.cart_items where user_id=v_user
      and product_id in (select item->>'product_id' from jsonb_array_elements(v_items) item);
  end if;
  return v_id;
end;
$$;
-- 기존 함수의 실행 권한·직접 쓰기 금지를 유지합니다. 새 권한은 추가하지 않습니다.
commit;
