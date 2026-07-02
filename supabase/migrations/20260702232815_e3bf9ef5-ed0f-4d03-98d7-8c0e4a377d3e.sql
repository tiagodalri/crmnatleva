GRANT SELECT ON public.proposals TO anon;
GRANT SELECT ON public.proposal_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_items TO authenticated;
GRANT ALL ON public.proposals TO service_role;
GRANT ALL ON public.proposal_items TO service_role;

DROP POLICY IF EXISTS temp_anon_full_proposal_items ON public.proposal_items;
DROP POLICY IF EXISTS "Public can read proposal items" ON public.proposal_items;

CREATE POLICY "Public can read proposal items"
ON public.proposal_items
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.proposals p
    WHERE p.id = proposal_items.proposal_id
      AND p.status = ANY (ARRAY['sent'::text, 'negotiation'::text, 'approved'::text, 'draft'::text, 'rascunho_ia'::text])
  )
);