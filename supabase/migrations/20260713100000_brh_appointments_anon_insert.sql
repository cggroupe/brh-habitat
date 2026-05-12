-- =============================================================================
-- Fix critique 12/05/2026 — RDV anonymes possibles depuis /diagnostic
-- =============================================================================
-- Le visiteur public qui termine son diagnostic et ouvre ContactRdvModal pour
-- demander un rappel ne pouvait PAS insérer dans brh_appointments : la policy
-- existante exigeait auth.uid() IS NOT NULL. Résultat : formulaire qui plante.
--
-- Fix : autoriser le rôle `anon` à insérer un RDV avec user_id NULL + un
-- minimum d'infos de contact (nom + email + téléphone obligatoires). Les
-- visiteurs loggés gardent l'ancienne policy.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Autorise les visiteurs anonymes à insérer un appointment public si :
--   - user_id IS NULL (pas de tentative d'usurper un compte)
--   - contact_name + contact_email + contact_phone renseignés (anti-spam minimum)
--   - type IN ('diagnostic','contact') — pas d'autres types réservés au backend
CREATE POLICY "Anonymous visitors can create public appointments" ON brh_appointments
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND contact_name IS NOT NULL AND length(trim(contact_name)) > 0
    AND contact_email IS NOT NULL AND length(trim(contact_email)) > 0
    AND contact_phone IS NOT NULL AND length(trim(contact_phone)) > 0
    AND type IN ('diagnostic', 'contact')
  );

-- Mention dans schéma : trail RGPD léger (les inserts anon n'ont pas user_id
-- mais on conserve contact_email + IP via headers logs Supabase pour DPO).
COMMENT ON POLICY "Anonymous visitors can create public appointments" ON brh_appointments IS
  'Permet aux visiteurs publics de demander un RDV via ContactRdvModal sans login.
  Contraintes : user_id NULL + contact_name/email/phone obligatoires + type limité.';

COMMIT;
