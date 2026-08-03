ALTER TABLE public.broadcast_campaigns
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_eligible_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_reason text;