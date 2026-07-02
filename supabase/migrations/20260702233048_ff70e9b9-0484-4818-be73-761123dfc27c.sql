CREATE UNIQUE INDEX IF NOT EXISTS uq_proposals_quote_request_id
ON public.proposals (quote_request_id)
WHERE quote_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_proposals_source_briefing_id
ON public.proposals (source_briefing_id)
WHERE source_briefing_id IS NOT NULL;