-- ====================================================================
-- Phase UX 08/05/2026 — Annuaire public partenaires sur /partenaires
-- ====================================================================
-- Objectif : permettre l'affichage SEO public des entreprises partenaires
-- BRH (logo, nom, ville, profession, website) pour donner une "proposition
-- de valeur maximale" aux pros qui s'inscrivent — visibilité gratuite,
-- leads naturels, citation Schema.org LocalBusiness.
--
-- Sécurité : la policy SELECT public ne donne PAS accès à owner_id, siret,
-- recruited_by, total_ca_apporte ou autres données business sensibles.
-- Le frontend doit explicitement lister les colonnes safe dans le .select().
-- ====================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Policy SELECT publique : tout le monde (anon + auth) peut lire les
-- entreprises actives. Les colonnes sensibles restent inaccessibles via
-- les autres policies (Pro voit sa company / Owner voit sa company /
-- Admin manage companies) qui n'ouvrent rien de plus.
DROP POLICY IF EXISTS "Public voit partenaires actifs" ON brh_companies;
CREATE POLICY "Public voit partenaires actifs" ON brh_companies
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

COMMENT ON POLICY "Public voit partenaires actifs" ON brh_companies IS
  'Phase UX 08/05/2026 — annuaire pro public sur /partenaires. Le frontend
  doit lister explicitement les colonnes safe (id, name, city, postal_code,
  logo_url, website, profession, level) dans son .select() — JAMAIS *.';

-- Index supplémentaire pour le tri par level + total_ca_apporte (top partenaires
-- en premier sur la page publique).
CREATE INDEX IF NOT EXISTS brh_companies_active_level
  ON brh_companies(is_active, level, total_ca_apporte DESC)
  WHERE is_active = true;

COMMIT;
