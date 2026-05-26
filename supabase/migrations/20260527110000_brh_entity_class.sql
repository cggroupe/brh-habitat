-- =============================================================================
-- 2026-05-27 — brh_sci_companies.entity_class : typage fin des entités
-- =============================================================================
--
-- Étend le flag is_utility en une classification 5 valeurs :
--   sci_patrimoniale : SCI/SARL/SAS détentrice foncière réelle (cible BRH)
--   utility          : opérateur réseau (ENEDIS, ORANGE, SNCF…) — pas de patrimoine
--   bailleur_social  : OPH, SA HLM, ESH (Neotoa, Espacil, Armor Habitat…)
--   collectivite    : commune, EPCI, département, région (SIREN préfixe 13/21/22/23/25)
--   autre            : tout le reste (peut être ré-évalué après enrichissement)
--
-- Utilisé par les fiches Data-B-style :
--   - badge sur OwnerCard (header)
--   - filtre "uniquement patrimoine réel" sur listes
--   - KPI hero distingue patrimoine vs utility
-- =============================================================================

ALTER TABLE public.brh_sci_companies
  ADD COLUMN IF NOT EXISTS entity_class TEXT;

ALTER TABLE public.brh_sci_companies
  ADD CONSTRAINT brh_sci_companies_entity_class_chk
  CHECK (entity_class IS NULL OR entity_class IN (
    'sci_patrimoniale',
    'utility',
    'bailleur_social',
    'collectivite',
    'autre'
  ));

-- ----------------------------------------------------------------------------
-- Backfill 1 : utility (réutilise le flag déjà calculé)
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET entity_class = 'utility'
WHERE entity_class IS NULL AND is_utility = true;

-- ----------------------------------------------------------------------------
-- Backfill 2 : collectivités (SIREN préfixe 13/21/22/23/25)
--   13xxxxx : départements
--   21xxxxx / 22xxxxx : communes
--   23xxxxx : régions
--   25xxxxx : EPCI / syndicats mixtes
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET entity_class = 'collectivite'
WHERE entity_class IS NULL
  AND siren IS NOT NULL
  AND substring(siren, 1, 2) IN ('13', '21', '22', '23', '25');

-- ----------------------------------------------------------------------------
-- Backfill 3 : bailleurs sociaux (NAF 68.20A/B - location HLM)
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET entity_class = 'bailleur_social'
WHERE entity_class IS NULL
  AND activite_principale IN ('68.20A', '68.20B');

-- ----------------------------------------------------------------------------
-- Backfill 4 : SCI patrimoniales (forme juridique 6540 = SCI, ou denomination 'SCI ')
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET entity_class = 'sci_patrimoniale'
WHERE entity_class IS NULL
  AND (
    forme_juridique = '6540'
    OR forme_juridique = 'SCI'
    OR denomination ILIKE 'SCI %'
    OR denomination ILIKE 'SCI-%'
  );

-- ----------------------------------------------------------------------------
-- Backfill 5 : reste = 'autre' (SARL, SAS, EURL, EI etc. qui peuvent être
-- patrimoniaux mais nécessitent enrichissement complémentaire pour confirmation)
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET entity_class = 'autre'
WHERE entity_class IS NULL;

-- ----------------------------------------------------------------------------
-- Index pour filtres rapides
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_brh_sci_companies_entity_class
  ON public.brh_sci_companies (entity_class);

CREATE INDEX IF NOT EXISTS idx_brh_sci_companies_patrimoniale
  ON public.brh_sci_companies (siren) WHERE entity_class = 'sci_patrimoniale';

COMMENT ON COLUMN public.brh_sci_companies.entity_class IS
  'Classification 5 valeurs : sci_patrimoniale | utility | bailleur_social | collectivite | autre. Utilisé pour badge UI + filtres patrimoine. Backfill 27/05.';
