-- 체험 예약(형준 담당 테이블)의 user_id 를 FastAPI 회원(app_users)에 연결한다.
-- 다른 기능의 테이블(profiles·cart_items·wishlist_items·orders·user_coupons)은 변경하지 않는다.
-- 사용자가 삭제되면 그 사용자의 예약도 함께 삭제한다(revoked_tokens 와 같은 방식).
begin;

alter table public.experience_reservations
  add constraint experience_reservations_user_id_fkey
  foreign key (user_id) references public.app_users(id) on delete cascade;

commit;
