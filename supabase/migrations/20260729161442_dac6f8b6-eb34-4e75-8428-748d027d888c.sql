CREATE OR REPLACE FUNCTION public.site_sessions_upsert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_sessions s WHERE s.id = NEW.id) THEN
    UPDATE public.site_sessions s
       SET last_seen_at = COALESCE(NEW.last_seen_at, now()),
           device_type  = COALESCE(NEW.device_type, s.device_type),
           referrer     = COALESCE(NEW.referrer, s.referrer),
           utm          = CASE WHEN NEW.utm IS NULL OR NEW.utm = '{}'::jsonb THEN s.utm ELSE NEW.utm END,
           landing_path = COALESCE(NEW.landing_path, s.landing_path),
           lead_id      = COALESCE(NEW.lead_id, s.lead_id)
     WHERE s.id = NEW.id;
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_sessions_upsert_guard ON public.site_sessions;
CREATE TRIGGER trg_site_sessions_upsert_guard
BEFORE INSERT ON public.site_sessions
FOR EACH ROW EXECUTE FUNCTION public.site_sessions_upsert_guard();