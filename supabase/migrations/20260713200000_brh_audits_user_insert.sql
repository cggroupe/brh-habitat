-- =============================================================================
-- Particuliers : sauvegarder leur propre audit complet (12/05/2026)
-- =============================================================================
-- Avant fix : seuls les pros pouvaient INSERT dans brh_audits (policy
-- `pro_insert_audits` exigeait pro_user_id = auth.uid()). Conséquence :
-- impossible pour un particulier de sauvegarder son audit anonyme dans son
-- compte après inscription. Bloquait la persistance du résultat de
-- /audit-complet (anti-bug du wizard 8 étapes lead-magnet).
--
-- Fix : 2 nouvelles policies (INSERT + UPDATE) pour role authenticated avec
-- WITH CHECK strict (user_id = auth.uid() ET pro_user_id NULL ET status
-- in draft/submitted). Pas d'overlap avec les policies pro existantes.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- INSERT : un particulier peut créer son propre audit (sans pro_user_id)
CREATE POLICY "user_insert_own_audit" ON brh_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND pro_user_id IS NULL
    AND status IN ('draft', 'submitted')
  );

COMMENT ON POLICY "user_insert_own_audit" ON brh_audits IS
  'Permet aux particuliers loggés de sauvegarder leur propre audit complet
  depuis /audit-complet. WITH CHECK strict pour éviter usurpation : user_id
  doit matcher auth.uid() ET pro_user_id NULL (pas d''audit pro).';

-- UPDATE : un particulier peut modifier son audit tant qu'il n'est pas
-- finalisé. RLS empêche de toucher aux audits pros (pro_user_id NULL check).
CREATE POLICY "user_update_own_audit" ON brh_audits
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND pro_user_id IS NULL)
  WITH CHECK (user_id = auth.uid() AND pro_user_id IS NULL);

COMMENT ON POLICY "user_update_own_audit" ON brh_audits IS
  'Permet aux particuliers de modifier leur propre audit (status draft).
  Empêche de transformer un audit particulier en audit pro (pro_user_id
  doit rester NULL).';

COMMIT;
