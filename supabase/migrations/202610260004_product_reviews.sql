-- Additive only: no existing product/auth/order schema changes.
BEGIN;
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content text NOT NULL CHECK (char_length(btrim(content)) BETWEEN 1 AND 1000),
    image_count integer NOT NULL DEFAULT 0 CHECK (image_count BETWEEN 0 AND 3),
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,
    deletion_reason text,
    UNIQUE(user_id,product_id)
);
CREATE INDEX IF NOT EXISTS product_reviews_product_created ON public.product_reviews(product_id,created_at DESC,id DESC) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS public.product_review_images (
    review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
    position integer NOT NULL CHECK (position BETWEEN 0 AND 2),
    body bytea NOT NULL CHECK (octet_length(body) <= 5242880),
    PRIMARY KEY(review_id,position)
);
-- All access passes through the FastAPI authenticated server, not anon REST.
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_reviews,public.product_review_images FROM anon,authenticated;
COMMIT;
