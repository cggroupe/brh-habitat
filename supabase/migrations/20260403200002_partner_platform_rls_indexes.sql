-- Migration: Partner Platform - RLS + Indexes + Realtime
-- Date: 2026-04-03

-- RLS sur toutes les nouvelles tables
ALTER TABLE brh_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_prospect_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_rewards_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_reward_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_platform_settings ENABLE ROW LEVEL SECURITY;

-- === COMPANIES ===
CREATE POLICY "Pro voit sa company" ON brh_companies FOR SELECT
  USING (id = public.get_my_company_id() OR public.is_admin());
CREATE POLICY "Owner modifie sa company" ON brh_companies FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Admin manage companies" ON brh_companies FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === COMPANY_MEMBERS ===
CREATE POLICY "Membre voit ses collegues" ON brh_company_members FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.is_admin());
CREATE POLICY "Admin manage membres" ON brh_company_members FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Owner gere ses membres" ON brh_company_members FOR INSERT
  WITH CHECK (
    company_id = public.get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM brh_company_members cm
      WHERE cm.company_id = brh_company_members.company_id
        AND cm.profile_id = auth.uid()
        AND cm.member_role = 'owner'
    )
  );
CREATE POLICY "Owner supprime ses membres" ON brh_company_members FOR DELETE
  USING (
    company_id = public.get_my_company_id()
    AND EXISTS (
      SELECT 1 FROM brh_company_members cm
      WHERE cm.company_id = brh_company_members.company_id
        AND cm.profile_id = auth.uid()
        AND cm.member_role = 'owner'
    )
  );

-- === AFFILIATES ===
CREATE POLICY "Affilie voit son profil" ON brh_affiliates FOR SELECT
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin manage affilies" ON brh_affiliates FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === PROSPECTS ===
CREATE POLICY "Pro voit prospects company" ON brh_prospects FOR SELECT
  USING (company_id = public.get_my_company_id() OR public.is_admin());
CREATE POLICY "Particulier voit ses prospects" ON brh_prospects FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Pro cree prospect company" ON brh_prospects FOR INSERT
  WITH CHECK (company_id = public.get_my_company_id() AND source_type = 'pro');
CREATE POLICY "Particulier cree prospect" ON brh_prospects FOR INSERT
  WITH CHECK (affiliate_id = auth.uid() AND source_type = 'particulier');
CREATE POLICY "Admin manage prospects" ON brh_prospects FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === PROSPECT_FILES ===
CREATE POLICY "Pro voit fichiers prospects" ON brh_prospect_files FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brh_prospects p WHERE p.id = prospect_id AND p.company_id = public.get_my_company_id())
    OR public.is_admin()
  );
CREATE POLICY "User upload fichiers" ON brh_prospect_files FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Admin manage fichiers" ON brh_prospect_files FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === QUOTES ===
CREATE POLICY "Pro voit ses quotes" ON brh_quotes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brh_prospects p WHERE p.id = prospect_id AND p.company_id = public.get_my_company_id())
    OR public.is_admin()
  );
CREATE POLICY "Particulier voit ses quotes" ON brh_quotes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM brh_prospects p WHERE p.id = prospect_id AND p.affiliate_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "Admin manage quotes" ON brh_quotes FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === POINTS_TRANSACTIONS ===
CREATE POLICY "Affilie voit ses transactions" ON brh_points_transactions FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin manage transactions" ON brh_points_transactions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === REWARDS_CATALOG ===
CREATE POLICY "Catalogue visible" ON brh_rewards_catalog FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage catalogue" ON brh_rewards_catalog FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === REWARD_CLAIMS ===
CREATE POLICY "Affilie voit ses demandes" ON brh_reward_claims FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Affilie cree demande" ON brh_reward_claims FOR INSERT
  WITH CHECK (affiliate_id = auth.uid());
CREATE POLICY "Admin manage demandes" ON brh_reward_claims FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === MESSAGE_THREADS ===
CREATE POLICY "Participant voit son thread" ON brh_message_threads FOR SELECT
  USING (participant_id = auth.uid() OR public.is_admin());
CREATE POLICY "User cree thread" ON brh_message_threads FOR INSERT
  WITH CHECK (participant_id = auth.uid());
CREATE POLICY "Admin manage threads" ON brh_message_threads FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === MESSAGES ===
CREATE POLICY "User voit messages threads" ON brh_messages FOR SELECT
  USING (
    sender_id = auth.uid()
    OR EXISTS (SELECT 1 FROM brh_message_threads t WHERE t.id = thread_id AND t.participant_id = auth.uid())
    OR public.is_admin()
  );
CREATE POLICY "User envoie message" ON brh_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Admin manage messages" ON brh_messages FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === NOTIFICATIONS ===
CREATE POLICY "User voit ses notifs" ON brh_notifications FOR SELECT
  USING (recipient_id = auth.uid());
CREATE POLICY "User marque notif lue" ON brh_notifications FOR UPDATE
  USING (recipient_id = auth.uid());
CREATE POLICY "Admin manage notifs" ON brh_notifications FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === PLATFORM_SETTINGS ===
CREATE POLICY "Settings lisibles" ON brh_platform_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manage settings" ON brh_platform_settings FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- === INDEXES ===
CREATE INDEX idx_brh_companies_owner ON brh_companies(owner_id);
CREATE INDEX idx_brh_company_members_company ON brh_company_members(company_id);
CREATE INDEX idx_brh_company_members_profile ON brh_company_members(profile_id);
CREATE INDEX idx_brh_prospects_company ON brh_prospects(company_id);
CREATE INDEX idx_brh_prospects_affiliate ON brh_prospects(affiliate_id);
CREATE INDEX idx_brh_prospects_submitted_by ON brh_prospects(submitted_by);
CREATE INDEX idx_brh_prospects_status ON brh_prospects(status);
CREATE INDEX idx_brh_prospect_files_prospect ON brh_prospect_files(prospect_id);
CREATE INDEX idx_brh_quotes_prospect ON brh_quotes(prospect_id);
CREATE INDEX idx_brh_quotes_commission_status ON brh_quotes(commission_status);
CREATE INDEX idx_brh_points_transactions_affiliate ON brh_points_transactions(affiliate_id);
CREATE INDEX idx_brh_reward_claims_affiliate ON brh_reward_claims(affiliate_id);
CREATE INDEX idx_brh_messages_thread ON brh_messages(thread_id);
CREATE INDEX idx_brh_notifications_recipient ON brh_notifications(recipient_id);
CREATE INDEX idx_brh_notifications_read ON brh_notifications(recipient_id, is_read);

-- === REALTIME ===
ALTER PUBLICATION supabase_realtime ADD TABLE brh_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE brh_messages;
