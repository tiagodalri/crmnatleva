
-- =========================================================
-- 1) Drop temp_anon / broad anon policies on public tables
-- =========================================================
DROP POLICY IF EXISTS temp_anon_full_ai_chat_history ON public.ai_chat_history;
DROP POLICY IF EXISTS temp_anon_full_attachments ON public.attachments;
DROP POLICY IF EXISTS temp_anon_full_hr_access_log ON public.hr_access_log;
DROP POLICY IF EXISTS temp_anon_full_trip_alteration_history ON public.trip_alteration_history;
DROP POLICY IF EXISTS temp_anon_full_proposals ON public.proposals;

-- portal tables
DROP POLICY IF EXISTS temp_anon_full_portal_notifications ON public.portal_notifications;
DROP POLICY IF EXISTS temp_anon_full_portal_assistant_logs ON public.portal_assistant_logs;
DROP POLICY IF EXISTS temp_anon_full_portal_published_sales ON public.portal_published_sales;
DROP POLICY IF EXISTS temp_anon_full_portal_checklist_items ON public.portal_checklist_items;
DROP POLICY IF EXISTS temp_anon_full_portal_quote_requests ON public.portal_quote_requests;

-- checkin / lodging
DROP POLICY IF EXISTS temp_anon_full_checkin_tasks ON public.checkin_tasks;
DROP POLICY IF EXISTS temp_anon_full_lodging_confirmation_tasks ON public.lodging_confirmation_tasks;
DROP POLICY IF EXISTS temp_anon_read_lodging_tasks ON public.lodging_confirmation_tasks;
DROP POLICY IF EXISTS "Allow all access to checkin_passenger_details" ON public.checkin_passenger_details;

-- multiple operational tables
DROP POLICY IF EXISTS temp_anon_full_automation_edges ON public.automation_edges;
DROP POLICY IF EXISTS temp_anon_full_automation_nodes ON public.automation_nodes;
DROP POLICY IF EXISTS temp_anon_full_automation_executions ON public.automation_executions;
DROP POLICY IF EXISTS temp_anon_full_automation_flows ON public.automation_flows;
DROP POLICY IF EXISTS temp_anon_full_flow_nodes ON public.flow_nodes;
DROP POLICY IF EXISTS temp_anon_full_flow_edges ON public.flow_edges;
DROP POLICY IF EXISTS temp_anon_full_flow_versions ON public.flow_versions;
DROP POLICY IF EXISTS temp_anon_full_flow_execution_logs ON public.flow_execution_logs;
DROP POLICY IF EXISTS temp_anon_full_flow_router_rules ON public.flow_router_rules;
DROP POLICY IF EXISTS temp_anon_full_flows ON public.flows;
DROP POLICY IF EXISTS temp_anon_full_ai_strategy_knowledge ON public.ai_strategy_knowledge;
DROP POLICY IF EXISTS temp_anon_full_ai_learned_patterns ON public.ai_learned_patterns;
DROP POLICY IF EXISTS temp_anon_full_ai_suggestions ON public.ai_suggestions;
DROP POLICY IF EXISTS temp_anon_full_ai_chat_suggestions ON public.ai_chat_suggestions;
DROP POLICY IF EXISTS temp_anon_full_ai_learning_events ON public.ai_learning_events;
DROP POLICY IF EXISTS temp_anon_full_ai_knowledge_base ON public.ai_knowledge_base;
DROP POLICY IF EXISTS temp_anon_full_commission_rules ON public.commission_rules;
DROP POLICY IF EXISTS temp_anon_full_payment_fee_rules ON public.payment_fee_rules;
DROP POLICY IF EXISTS temp_anon_full_tariff_conditions ON public.tariff_conditions;
DROP POLICY IF EXISTS temp_anon_full_natleva_brain_insights ON public.natleva_brain_insights;
DROP POLICY IF EXISTS temp_anon_full_whatsapp_templates ON public.whatsapp_templates;
DROP POLICY IF EXISTS temp_anon_full_whatsapp_qr_sessions ON public.whatsapp_qr_sessions;
DROP POLICY IF EXISTS temp_anon_full_livechat_users ON public.livechat_users;
DROP POLICY IF EXISTS temp_anon_full_user_locations ON public.user_locations;
DROP POLICY IF EXISTS temp_anon_full_hotel_media_cache ON public.hotel_media_cache;
DROP POLICY IF EXISTS temp_anon_full_hotel_contact_directory ON public.hotel_contact_directory;
DROP POLICY IF EXISTS temp_anon_full_chart_of_accounts ON public.chart_of_accounts;
DROP POLICY IF EXISTS temp_anon_full_webhook_logs ON public.webhook_logs;
DROP POLICY IF EXISTS temp_anon_full_conversation_reconciliation_log ON public.conversation_reconciliation_log;
DROP POLICY IF EXISTS temp_anon_full_conversation_transfers ON public.conversation_transfers;
DROP POLICY IF EXISTS temp_anon_full_trip_alteration_attachments ON public.trip_alteration_attachments;
DROP POLICY IF EXISTS temp_anon_full_goals ON public.goals;

-- =========================================================
-- 2) portal_settings: restrict to authenticated CRM users
-- =========================================================
DROP POLICY IF EXISTS portal_settings_all_access ON public.portal_settings;
CREATE POLICY "Authenticated can read portal_settings"
  ON public.portal_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify portal_settings"
  ON public.portal_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 3) prateleira_leads: anon INSERT only
-- =========================================================
DROP POLICY IF EXISTS prateleira_leads_all_anon ON public.prateleira_leads;
CREATE POLICY "Anon can submit prateleira leads"
  ON public.prateleira_leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can manage prateleira leads"
  ON public.prateleira_leads FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- =========================================================
-- 4) affiliate_payouts: enable RLS + owner/admin scoping
-- =========================================================
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;

DROP POLICY IF EXISTS "Affiliates can view own payouts" ON public.affiliate_payouts;
CREATE POLICY "Affiliates can view own payouts"
  ON public.affiliate_payouts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliates a
      WHERE a.id = affiliate_payouts.affiliate_id
        AND a.user_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can manage payouts" ON public.affiliate_payouts;
CREATE POLICY "Admins can manage payouts"
  ON public.affiliate_payouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================================================
-- 5) Storage: marketing-assets — remove anon write/update/delete
-- =========================================================
DROP POLICY IF EXISTS "marketing-assets anon write" ON storage.objects;
DROP POLICY IF EXISTS "marketing-assets anon update" ON storage.objects;
DROP POLICY IF EXISTS "marketing-assets anon delete" ON storage.objects;

CREATE POLICY "marketing-assets authenticated write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'marketing-assets');
CREATE POLICY "marketing-assets authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'marketing-assets');
CREATE POLICY "marketing-assets authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketing-assets');

-- =========================================================
-- 6) Storage: stickers — restrict writes to authenticated
-- =========================================================
DROP POLICY IF EXISTS "stickers anon write" ON storage.objects;
DROP POLICY IF EXISTS "stickers anon update" ON storage.objects;
DROP POLICY IF EXISTS "stickers anon delete" ON storage.objects;

CREATE POLICY "stickers authenticated write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stickers');
CREATE POLICY "stickers authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stickers');
CREATE POLICY "stickers authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stickers');

-- =========================================================
-- 7) Storage: passenger-attachments — remove public policies
--    Reads/writes limited to authenticated users only.
-- =========================================================
DROP POLICY IF EXISTS passenger_attachments_read ON storage.objects;
DROP POLICY IF EXISTS passenger_attachments_insert ON storage.objects;
DROP POLICY IF EXISTS passenger_attachments_update ON storage.objects;
DROP POLICY IF EXISTS passenger_attachments_delete ON storage.objects;

CREATE POLICY passenger_attachments_read_auth
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'passenger-attachments');
CREATE POLICY passenger_attachments_insert_auth
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'passenger-attachments');
CREATE POLICY passenger_attachments_update_auth
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'passenger-attachments');
CREATE POLICY passenger_attachments_delete_auth
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'passenger-attachments');

-- =========================================================
-- 8) Storage: portal-documents — scope reads to portal_access.client_id
--    Path convention: "<client_id>/..." (first path segment = client id)
-- =========================================================
DROP POLICY IF EXISTS "Portal users can read trip documents" ON storage.objects;
CREATE POLICY "Portal users can read own trip documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'portal-documents' AND (
      -- CRM staff (any role) can read everything
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
      -- Portal users only see files under their own client folder
      OR (
        (storage.foldername(name))[1] = public.get_portal_client_id(auth.uid())::text
      )
    )
  );
