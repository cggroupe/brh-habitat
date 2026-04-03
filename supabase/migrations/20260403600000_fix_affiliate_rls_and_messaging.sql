-- Migration: Fix RLS affiliates + messaging tables
-- Date: 2026-04-03
-- Bug: Pas de policy INSERT/UPDATE sur brh_affiliates pour le proprietaire
-- Bug: Pas de policy INSERT sur brh_affiliates pour auto-creation a l'inscription

-- ============================================================
-- Fix brh_affiliates : permettre INSERT + UPDATE par le proprietaire
-- ============================================================
CREATE POLICY "Affilie cree son profil" ON brh_affiliates FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Affilie modifie son profil" ON brh_affiliates FOR UPDATE
  USING (id = auth.uid());

-- ============================================================
-- Fix brh_prospects : permettre aux particuliers de voir aussi leurs propres prospects
-- (la policy existante utilise affiliate_id mais certains prospects ont submitted_by)
-- ============================================================
CREATE POLICY "Particulier voit prospects soumis" ON brh_prospects FOR SELECT
  USING (submitted_by = auth.uid());

-- ============================================================
-- Fix brh_message_threads : permettre au participant de creer un thread
-- (policy existante ne couvre que SELECT)
-- ============================================================
-- Deja couvert par "User cree thread" policy (INSERT WITH CHECK participant_id = auth.uid())
-- Mais il manque la policy UPDATE pour le participant (marquer archive, etc.)
CREATE POLICY "Participant modifie son thread" ON brh_message_threads FOR UPDATE
  USING (participant_id = auth.uid());

-- Fix brh_messages : permettre mark as read par le destinataire
CREATE POLICY "User modifie ses messages" ON brh_messages FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM brh_message_threads t WHERE t.id = thread_id AND t.participant_id = auth.uid())
    OR sender_id = auth.uid()
  );
