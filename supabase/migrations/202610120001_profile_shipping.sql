begin;

-- 기본 배송지 한 곳. 주문 시에는 orders에 배송 정보를 별도로 복사합니다.
alter table public.profiles
  add column recipient_name text,
  add column recipient_phone text,
  add column postal_code text,
  add column address text,
  add column address_detail text,
  add constraint profiles_shipping_valid check (
    (recipient_name is null and recipient_phone is null and postal_code is null
      and address is null and address_detail is null)
    or
    (recipient_name is not null and recipient_phone is not null and postal_code is not null
      and address is not null and address_detail is not null
      and recipient_name = btrim(recipient_name) and char_length(recipient_name) between 2 and 40
      and recipient_phone ~ '^0[0-9]{8,10}$'
      and postal_code ~ '^[0-9]{5}$'
      and address = btrim(address) and char_length(address) between 5 and 200
      and address_detail = btrim(address_detail) and char_length(address_detail) <= 100)
  );

-- 기존 본인 전용 RLS를 유지하며 배송지 필드 수정만 허용합니다.
grant update (recipient_name, recipient_phone, postal_code, address, address_detail)
  on public.profiles to authenticated;

commit;
