CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  excerpt text,
  content_md text,
  cover_image_url text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  seo_title text,
  seo_description text,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_anon_select_published" ON public.blog_posts FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "blog_posts_auth_all" ON public.blog_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_blog_posts_status ON public.blog_posts (status, published_at DESC);

CREATE TABLE public.site_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  cover_image_url text,
  price_from_text text,
  proposal_slug text,
  highlights text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_packages TO authenticated;
GRANT ALL ON public.site_packages TO service_role;
ALTER TABLE public.site_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_packages_anon_select_published" ON public.site_packages FOR SELECT TO anon USING (status = 'published');
CREATE POLICY "site_packages_auth_all" ON public.site_packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_site_packages_updated_at BEFORE UPDATE ON public.site_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.site_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz,
  device_type text,
  referrer text,
  utm jsonb NOT NULL DEFAULT '{}',
  landing_path text,
  lead_id uuid
);
GRANT INSERT, UPDATE ON public.site_sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_sessions TO authenticated;
GRANT ALL ON public.site_sessions TO service_role;
ALTER TABLE public.site_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_sessions_anon_insert" ON public.site_sessions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "site_sessions_anon_update" ON public.site_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "site_sessions_auth_select" ON public.site_sessions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.site_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  phone text,
  message text,
  interest text,
  source_path text,
  utm jsonb NOT NULL DEFAULT '{}',
  session_id uuid REFERENCES public.site_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_leads TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_leads TO authenticated;
GRANT ALL ON public.site_leads TO service_role;
ALTER TABLE public.site_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_leads_anon_insert" ON public.site_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "site_leads_auth_select" ON public.site_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "site_leads_auth_update" ON public.site_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_site_leads_created_at ON public.site_leads (created_at DESC);

CREATE TABLE public.site_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id uuid REFERENCES public.site_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  path text,
  section_name text,
  event_data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_events TO anon;
GRANT SELECT, INSERT ON public.site_events TO authenticated;
GRANT ALL ON public.site_events TO service_role;
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_events_anon_insert" ON public.site_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "site_events_auth_select" ON public.site_events FOR SELECT TO authenticated USING (true);
CREATE INDEX idx_site_events_session ON public.site_events (session_id, created_at DESC);