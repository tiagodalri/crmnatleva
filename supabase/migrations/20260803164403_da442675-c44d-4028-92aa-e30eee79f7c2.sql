-- 1) broadcast_campaigns
CREATE TABLE public.broadcast_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  message_text text,
  media_url text,
  media_type text,
  media_filename text,
  media_mimetype text,
  media_size_bytes bigint,
  caption text,
  audience_type text NOT NULL CHECK (audience_type IN ('manual','last_n')),
  audience_size integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','test_sent','confirmed','sending','paused','completed','cancelled','failed')),
  throttle_min_seconds integer NOT NULL DEFAULT 15,
  throttle_max_seconds integer NOT NULL DEFAULT 30,
  daily_limit integer NOT NULL DEFAULT 150,
  total_recipients integer NOT NULL DEFAULT 0,
  total_sent integer NOT NULL DEFAULT 0,
  total_failed integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  confirmed_by uuid REFERENCES auth.users(id),
  confirmed_at timestamptz,
  test_sent_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_campaigns TO authenticated;
GRANT ALL ON public.broadcast_campaigns TO service_role;

ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gestores podem ver campanhas"
  ON public.broadcast_campaigns FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem criar campanhas"
  ON public.broadcast_campaigns FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem atualizar campanhas"
  ON public.broadcast_campaigns FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem excluir campanhas"
  ON public.broadcast_campaigns FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER update_broadcast_campaigns_updated_at
  BEFORE UPDATE ON public.broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) broadcast_recipients
CREATE TABLE public.broadcast_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.broadcast_campaigns(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.conversations(id),
  phone text NOT NULL,
  contact_name text,
  order_index integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','skipped_optout','skipped_duplicate')),
  sent_at timestamptz,
  external_message_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_broadcast_recipients_campaign_status ON public.broadcast_recipients (campaign_id, status);
CREATE UNIQUE INDEX idx_broadcast_recipients_campaign_phone ON public.broadcast_recipients (campaign_id, phone);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcast_recipients TO authenticated;
GRANT ALL ON public.broadcast_recipients TO service_role;

ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gestores podem ver destinatarios"
  ON public.broadcast_recipients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem criar destinatarios"
  ON public.broadcast_recipients FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem atualizar destinatarios"
  ON public.broadcast_recipients FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem excluir destinatarios"
  ON public.broadcast_recipients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER update_broadcast_recipients_updated_at
  BEFORE UPDATE ON public.broadcast_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) whatsapp_optouts
CREATE TABLE public.whatsapp_optouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  opted_out_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_optouts TO authenticated;
GRANT ALL ON public.whatsapp_optouts TO service_role;

ALTER TABLE public.whatsapp_optouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e gestores podem ver optouts"
  ON public.whatsapp_optouts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem criar optouts"
  ON public.whatsapp_optouts FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem atualizar optouts"
  ON public.whatsapp_optouts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins e gestores podem excluir optouts"
  ON public.whatsapp_optouts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));