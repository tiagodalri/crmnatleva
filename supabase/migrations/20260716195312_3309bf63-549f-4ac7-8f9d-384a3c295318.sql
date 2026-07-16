
CREATE TABLE public.whatsapp_short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code text NOT NULL UNIQUE,
  target_phone text NOT NULL,
  message text,
  full_wa_url text NOT NULL,
  label text,
  click_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_short_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_short_links TO authenticated;
GRANT ALL ON public.whatsapp_short_links TO service_role;

ALTER TABLE public.whatsapp_short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active short links"
  ON public.whatsapp_short_links FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated can read all their short links"
  ON public.whatsapp_short_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create short links"
  ON public.whatsapp_short_links FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Owners or admins can update short links"
  ON public.whatsapp_short_links FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners or admins can delete short links"
  ON public.whatsapp_short_links FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_whatsapp_short_links_updated_at
  BEFORE UPDATE ON public.whatsapp_short_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_whatsapp_short_links_short_code ON public.whatsapp_short_links(short_code);
CREATE INDEX idx_whatsapp_short_links_created_by ON public.whatsapp_short_links(created_by);


CREATE TABLE public.whatsapp_short_link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_link_id uuid NOT NULL REFERENCES public.whatsapp_short_links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  referrer text
);

GRANT INSERT ON public.whatsapp_short_link_clicks TO anon;
GRANT SELECT, INSERT ON public.whatsapp_short_link_clicks TO authenticated;
GRANT ALL ON public.whatsapp_short_link_clicks TO service_role;

ALTER TABLE public.whatsapp_short_link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register a click"
  ON public.whatsapp_short_link_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated can read clicks"
  ON public.whatsapp_short_link_clicks FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX idx_whatsapp_short_link_clicks_link_id ON public.whatsapp_short_link_clicks(short_link_id);


CREATE OR REPLACE FUNCTION public.increment_whatsapp_short_link_click_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.whatsapp_short_links
  SET click_count = click_count + 1
  WHERE id = NEW.short_link_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_whatsapp_short_link_clicks_increment
  AFTER INSERT ON public.whatsapp_short_link_clicks
  FOR EACH ROW EXECUTE FUNCTION public.increment_whatsapp_short_link_click_count();
