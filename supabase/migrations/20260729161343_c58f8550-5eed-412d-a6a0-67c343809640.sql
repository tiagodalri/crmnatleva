-- Data API grants (RLS já configurada; faltavam os GRANTs -> 42501)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- blog_posts: leitura pública de publicados
GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

-- site_packages: leitura pública de publicados
GRANT SELECT ON public.site_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_packages TO authenticated;
GRANT ALL ON public.site_packages TO service_role;

-- site_sessions: anon insere e atualiza (upsert merge-duplicates), sem SELECT
GRANT INSERT, UPDATE ON public.site_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_sessions TO authenticated;
GRANT ALL ON public.site_sessions TO service_role;

-- site_events: anon apenas insere
GRANT INSERT ON public.site_events TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.site_events_id_seq TO anon, authenticated;
GRANT SELECT, INSERT ON public.site_events TO authenticated;
GRANT ALL ON public.site_events TO service_role;
GRANT ALL ON SEQUENCE public.site_events_id_seq TO service_role;

-- site_leads: anon apenas insere
GRANT INSERT ON public.site_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_leads TO authenticated;
GRANT ALL ON public.site_leads TO service_role;