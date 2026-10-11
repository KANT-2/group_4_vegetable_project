-- C 이상재: 상품 이름과 별도로 표시할 선택 홍보 문구입니다.
begin;

alter table public.products add column tagline text;
comment on column public.products.tagline is '상품 홍보 문구. 미등록 상품은 NULL이며 상품 이름·못난이 이유와 별도로 표시합니다.';

commit;
