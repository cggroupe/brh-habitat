-- =============================================================================
-- 2026-05-26 — brh_sci_companies.is_utility : flag entités non-foncières
-- =============================================================================
--
-- Bug audit Opus 4.7 : ENEDIS, ORANGE, GRDF, SFR, etc. sont stockés comme
-- "SCI" et figurent en owner_siren de 1380 DPE — mais ce sont des
-- distributeurs (le SIREN du titulaire du compteur a été pris pour le
-- propriétaire du bâtiment).
--
-- Conséquence UI : les 20 dirigeants ENEDIS apparaissaient chacun avec
-- "1100 DPE détenus via ENEDIS" → faux complet, ce sont des execs
-- pas des bailleurs.
--
-- Fix : flag is_utility par code NAF utility + filtrage en query
-- patrimoine via SCI ET rôles entreprise.
-- =============================================================================

ALTER TABLE public.brh_sci_companies
  ADD COLUMN IF NOT EXISTS is_utility BOOLEAN NOT NULL DEFAULT false;

-- NAF utility (distributeurs énergie/eau/télécoms/transport) — JAMAIS propriétaires fonciers.
-- Liste exhaustive issue de l'audit 26/05 (20+ SIREN trouvés dans le top owner_siren).
UPDATE public.brh_sci_companies
SET is_utility = true
WHERE activite_principale IN (
  '35.11Z', -- Production d'électricité
  '35.12Z', -- Transport d'électricité
  '35.13Z', -- Distribution d'électricité (ENEDIS)
  '35.14Z', -- Commerce d'électricité
  '35.21Z', -- Production de gaz
  '35.22Z', -- Distribution de gaz (GRDF)
  '35.23Z', -- Commerce de gaz par conduites
  '35.30Z', -- Production/distribution chauffage urbain
  '36.00Z', -- Captage/distribution d'eau
  '37.00Z', -- Collecte/traitement eaux usées
  '38.11Z', -- Collecte déchets non dangereux
  '38.12Z', -- Collecte déchets dangereux
  '46.71Z', -- Commerce gros produits pétroliers (TOTAL)
  '49.10Z', -- Transport ferroviaire (SNCF)
  '49.20Z', -- Transport ferroviaire de fret
  '53.10Z', -- Activités de poste (LA POSTE)
  '60.10Z', -- Édition radio
  '60.20A', '60.20B', -- Édition chaînes TV
  '61.10Z', -- Télécoms filaires (ORANGE, TOTEM)
  '61.20Z', -- Télécoms sans fil (SFR, BOUYGUES TELECOM)
  '61.30Z', -- Télécoms par satellite
  '61.90Z'  -- Autres activités télécoms
);

-- Index partiel pour les queries WHERE NOT is_utility (90 %+ des accès patrimoine).
CREATE INDEX IF NOT EXISTS idx_brh_sci_companies_not_utility
  ON public.brh_sci_companies (siren) WHERE NOT is_utility;

COMMENT ON COLUMN public.brh_sci_companies.is_utility IS
  'true si entité utility (distributeur énergie/eau/télécom/transport) — JAMAIS propriétaire foncier. À exclure des queries patrimoine. Bug ingest 26/05 : SIREN titulaire compteur confondu avec propriétaire bâtiment.';
