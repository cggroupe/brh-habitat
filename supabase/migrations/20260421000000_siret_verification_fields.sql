-- Migration: Ajouter les champs de verification SIRET via API SIRENE
-- Date: 2026-04-21
-- Objectif: Stocker les donnees officielles (pas ce que l'user tape)
--           + prouver la verification via timestamp

ALTER TABLE brh_companies
  ADD COLUMN IF NOT EXISTS legal_name TEXT,          -- nom_raison_sociale officiel INSEE
  ADD COLUMN IF NOT EXISTS naf_code TEXT,            -- code NAF/APE (ex: 43.91B)
  ADD COLUMN IF NOT EXISTS naf_label TEXT,           -- libelle du NAF
  ADD COLUMN IF NOT EXISTS siren TEXT,               -- les 9 premiers chiffres du SIRET
  ADD COLUMN IF NOT EXISTS siret_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entreprise_category TEXT, -- PME / ETI / GE
  ADD COLUMN IF NOT EXISTS date_creation DATE;

-- Unique sur SIRET pour eviter doublons (si rempli)
CREATE UNIQUE INDEX IF NOT EXISTS idx_brh_companies_siret_unique
  ON brh_companies(siret) WHERE siret IS NOT NULL;

-- Index sur SIREN pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_brh_companies_siren
  ON brh_companies(siren) WHERE siren IS NOT NULL;
