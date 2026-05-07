-- Phase 19 Sprint H : filtre date deces + tri "succession recente" (07/05/2026)
-- Killer feature business : un deces recent = succession en cours = opportunite
-- vente/contact pour les agences. On ajoute :
--   1. Colonne `latest_deces_date` calculee depuis dirigeants[*].deces_date
--   2. Index DESC pour tri "decès récents en haut"
--   3. EF sci-deces-match maintenant met a jour cette colonne automatiquement
--
-- Migration deja appliquee via psql direct le 07/05.

ALTER TABLE brh_sci_companies
  ADD COLUMN IF NOT EXISTS latest_deces_date DATE;

CREATE INDEX IF NOT EXISTS brh_sci_companies_latest_deces
  ON brh_sci_companies (latest_deces_date DESC NULLS LAST)
  WHERE latest_deces_date IS NOT NULL;
