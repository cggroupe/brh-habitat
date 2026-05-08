-- ====================================================================
-- Phase G fix 08/05/2026 — Opt-in explicite pour apparaître dans l'annuaire public
-- ====================================================================
-- Contexte : la migration 20260706600000 (policy SELECT publique sur is_active=true)
-- exposait TOUTES les entreprises de brh_companies, y compris celles créées par
-- import / seed / inscription test sans le consentement explicite de l'entreprise.
-- Risque business : un dirigeant tombe sur sa boîte listée comme "partenaire BRH"
-- sans avoir signé la moindre charte → fausse représentation.
--
-- Solution : nouvelle colonne `is_public_partner BOOLEAN DEFAULT false` qui doit
-- être positionnée explicitement à true par le pro lui-même (toggle profil) ou
-- l'admin BRH (validation manuelle après signature charte). La policy publique
-- s'appuie désormais sur ce flag.
-- ====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- 1. Nouvelle colonne opt-in (default false = aucun pro opt-in par défaut)
ALTER TABLE brh_companies
  ADD COLUMN IF NOT EXISTS is_public_partner BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN brh_companies.is_public_partner IS
  'Opt-in explicite pour apparaître dans l''annuaire public /partenaires.
  Doit être positionné à true par le pro lui-même (toggle profil) ou par
  l''admin BRH après vérification. Default false pour respecter le consentement.';

-- 2. Drop l'ancienne policy permissive (déjà droppée à chaud, mais idempotent)
DROP POLICY IF EXISTS "Public voit partenaires actifs" ON brh_companies;

-- 3. Nouvelle policy stricte : SELECT public uniquement si is_public_partner=true
CREATE POLICY "Public voit partenaires opt-in" ON brh_companies
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_public_partner = true);

COMMENT ON POLICY "Public voit partenaires opt-in" ON brh_companies IS
  'Phase G fix 08/05/2026 — annuaire pro public sur /partenaires avec opt-in
  explicite. Le frontend doit lister explicitement les colonnes safe (id, name,
  city, postal_code, logo_url, website, profession, level) dans son .select().';

-- 4. Index dédié au filtrage opt-in
DROP INDEX IF EXISTS brh_companies_active_level;
CREATE INDEX IF NOT EXISTS brh_companies_public_level
  ON brh_companies(is_public_partner, level, total_ca_apporte DESC)
  WHERE is_public_partner = true;

COMMIT;
