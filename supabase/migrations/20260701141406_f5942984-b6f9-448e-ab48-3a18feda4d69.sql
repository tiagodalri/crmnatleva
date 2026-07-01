DROP POLICY IF EXISTS "Public can read proposals by slug" ON public.proposals;
CREATE POLICY "Public can read proposals by slug"
ON public.proposals
FOR SELECT
TO anon
USING (status = ANY (ARRAY['sent'::text, 'negotiation'::text, 'approved'::text, 'draft'::text, 'rascunho_ia'::text]));