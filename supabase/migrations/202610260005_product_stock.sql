-- 상품 재고. 모의 결제 주문이 저장될 때 FastAPI 가 같은 트랜잭션에서 차감한다.
-- 기존 상품은 시연용으로 20개씩 채운다. 0개면 판매 중(is_active)이어도 고객 화면에 품절로 표시된다.
BEGIN;
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 20;
ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS products_stock_range;
ALTER TABLE public.products
    ADD CONSTRAINT products_stock_range CHECK (stock BETWEEN 0 AND 1000000);
COMMIT;
