-- Keep product cards and review lists consistent, including moderation and seeds.
BEGIN;
CREATE OR REPLACE FUNCTION public.refresh_product_review_aggregates()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE target text;
BEGIN
    FOR target IN
        SELECT DISTINCT id FROM unnest(ARRAY[
            CASE WHEN TG_OP <> 'INSERT' THEN OLD.product_id END,
            CASE WHEN TG_OP <> 'DELETE' THEN NEW.product_id END
        ]) AS ids(id) WHERE id IS NOT NULL ORDER BY id
    LOOP
        -- Serialize concurrent review mutations before taking a fresh aggregate.
        PERFORM 1 FROM public.products WHERE id = target FOR UPDATE;
        UPDATE public.products SET
            review_count = (SELECT count(*) FROM public.product_reviews WHERE product_id = target AND deleted_at IS NULL),
            rating = (SELECT round(avg(rating)::numeric, 1) FROM public.product_reviews WHERE product_id = target AND deleted_at IS NULL)
        WHERE id = target;
    END LOOP;
    RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS product_review_aggregates ON public.product_reviews;
CREATE TRIGGER product_review_aggregates
AFTER INSERT OR DELETE OR UPDATE OF rating, deleted_at, product_id ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_product_review_aggregates();

UPDATE public.products p SET
    review_count = (SELECT count(*) FROM public.product_reviews r WHERE r.product_id=p.id AND r.deleted_at IS NULL),
    rating = (SELECT round(avg(r.rating)::numeric, 1) FROM public.product_reviews r WHERE r.product_id=p.id AND r.deleted_at IS NULL);
COMMIT;
