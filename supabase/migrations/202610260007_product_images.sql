-- 관리자 화면에서 올린 상품 사진. FastAPI 가 다시 인코딩(EXIF 제거·JPEG)해 저장한다.
-- products.image_path 는 '/api/product-images/{상품 ID}?v={버전}' 을 가리킨다.
BEGIN;
CREATE TABLE IF NOT EXISTS public.product_images (
    product_id text PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
    body bytea NOT NULL CHECK (octet_length(body) <= 5242880),
    updated_at timestamptz NOT NULL DEFAULT now()
);
-- 모든 접근은 FastAPI 서버를 거친다(익명 REST 접근 차단).
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_images FROM anon, authenticated;
COMMIT;
