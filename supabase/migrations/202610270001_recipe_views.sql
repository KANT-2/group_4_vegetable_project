-- 레시피는 DB·파일 카탈로그를 합쳐 제공하므로 recipes 외래키를 두지 않는다.
-- 익명 UUID만 저장하며 이메일·IP·회원 ID는 수집하지 않는다.
BEGIN;
CREATE TABLE IF NOT EXISTS public.recipe_view_events (
    recipe_id text NOT NULL CHECK (recipe_id ~ '^[a-z0-9-]{1,80}$'),
    visitor_id uuid NOT NULL,
    viewed_hour timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
    viewed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (recipe_id, visitor_id, viewed_hour)
);
CREATE INDEX IF NOT EXISTS recipe_view_events_recent ON public.recipe_view_events(viewed_at, recipe_id);
ALTER TABLE public.recipe_view_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.recipe_view_events FROM anon, authenticated;
COMMIT;
