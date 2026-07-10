CREATE TABLE public.passenger_pending_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matched_passenger_id UUID REFERENCES public.passengers(id) ON DELETE SET NULL,
  matched_by TEXT NOT NULL CHECK (matched_by IN ('cpf', 'passport', 'both')),
  signup_link_id UUID REFERENCES public.passenger_signup_links(id) ON DELETE SET NULL,
  submission_id TEXT,
  submitted_data JSONB NOT NULL,
  submitter_ip TEXT,
  submitter_user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'discarded', 'merged')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  applied_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX passenger_pending_submissions_submission_id_uidx
  ON public.passenger_pending_submissions (submission_id)
  WHERE submission_id IS NOT NULL;

CREATE INDEX idx_pending_status_created ON public.passenger_pending_submissions (status, created_at DESC);
CREATE INDEX idx_pending_matched_passenger ON public.passenger_pending_submissions (matched_passenger_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.passenger_pending_submissions TO authenticated;
GRANT ALL ON public.passenger_pending_submissions TO service_role;

ALTER TABLE public.passenger_pending_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated staff can view pending submissions"
  ON public.passenger_pending_submissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated staff can update pending submissions"
  ON public.passenger_pending_submissions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated staff can delete pending submissions"
  ON public.passenger_pending_submissions FOR DELETE
  TO authenticated
  USING (true);

CREATE TRIGGER update_passenger_pending_submissions_updated_at
  BEFORE UPDATE ON public.passenger_pending_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
