-- B 심우섭: 상품 카드 표시용 컬럼 추가. 202610080002_market_tables.sql 다음에 적용합니다.
-- tagline은 카드 위 홍보 문구, rating·review_count는 시연용 가상 별점·리뷰 수입니다.
-- 리뷰 테이블은 만들지 않고, 값은 seed로만 넣습니다. 일반 사용자 쓰기 권한은 기존 그대로 없습니다.
-- 공용 DB에 tagline이 먼저 추가된 상태여서 이미 있는 컬럼은 건너뜁니다.
begin;

alter table public.products
  add column if not exists tagline text,
  add column if not exists rating numeric(2, 1),
  add column if not exists review_count integer not null default 0;

alter table public.products
  add constraint products_tagline_check
    check (tagline is null or char_length(tagline) between 1 and 40),
  add constraint products_rating_check
    check (rating is null or rating between 0 and 5),
  add constraint products_review_count_check
    check (review_count >= 0);

comment on column public.products.tagline is '카드 위 홍보 문구 (예: 향은 그대로, 가격은 가볍게)';
comment on column public.products.rating is '시연용 가상 평균 별점 (0~5)';
comment on column public.products.review_count is '시연용 가상 리뷰 수';

commit;
