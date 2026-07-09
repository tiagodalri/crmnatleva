CREATE TABLE IF NOT EXISTS public.proposal_change_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('proposal', 'proposal_item')),
  entity_id uuid NOT NULL,
  proposal_id uuid,
  operation text NOT NULL CHECK (operation IN ('UPDATE', 'DELETE')),
  previous_data jsonb NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid DEFAULT auth.uid()
);

GRANT SELECT ON public.proposal_change_history TO authenticated;
GRANT ALL ON public.proposal_change_history TO service_role;

ALTER TABLE public.proposal_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read proposal change history" ON public.proposal_change_history;
CREATE POLICY "Authenticated users can read proposal change history"
ON public.proposal_change_history
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_proposal_change_history_proposal_id_changed_at
ON public.proposal_change_history (proposal_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_proposal_change_history_entity
ON public.proposal_change_history (entity_type, entity_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.capture_proposal_change_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      INSERT INTO public.proposal_change_history (
        entity_type,
        entity_id,
        proposal_id,
        operation,
        previous_data,
        changed_by
      ) VALUES (
        'proposal',
        OLD.id,
        OLD.id,
        TG_OP,
        to_jsonb(OLD),
        auth.uid()
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.proposal_change_history (
      entity_type,
      entity_id,
      proposal_id,
      operation,
      previous_data,
      changed_by
    ) VALUES (
      'proposal',
      OLD.id,
      OLD.id,
      TG_OP,
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_proposal_item_change_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
      INSERT INTO public.proposal_change_history (
        entity_type,
        entity_id,
        proposal_id,
        operation,
        previous_data,
        changed_by
      ) VALUES (
        'proposal_item',
        OLD.id,
        OLD.proposal_id,
        TG_OP,
        to_jsonb(OLD),
        auth.uid()
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.proposal_change_history (
      entity_type,
      entity_id,
      proposal_id,
      operation,
      previous_data,
      changed_by
    ) VALUES (
      'proposal_item',
      OLD.id,
      OLD.proposal_id,
      TG_OP,
      to_jsonb(OLD),
      auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_capture_proposal_change_history ON public.proposals;
CREATE TRIGGER trg_capture_proposal_change_history
BEFORE UPDATE OR DELETE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.capture_proposal_change_history();

DROP TRIGGER IF EXISTS trg_capture_proposal_item_change_history ON public.proposal_items;
CREATE TRIGGER trg_capture_proposal_item_change_history
BEFORE UPDATE OR DELETE ON public.proposal_items
FOR EACH ROW
EXECUTE FUNCTION public.capture_proposal_item_change_history();