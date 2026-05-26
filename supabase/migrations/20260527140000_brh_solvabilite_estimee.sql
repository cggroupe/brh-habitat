-- =============================================================================
-- 2026-05-27 — brh_sci_companies.solvabilite_estimee
-- =============================================================================
--
-- Pattern Data-B "score = catégorie sémantique" : on stocke une catégorie
-- métier lisible directement plutôt qu'un chiffre brut.
--
-- Valeurs :
--   faible    : société active, capital ≥ 100k€, créée il y a > 2 ans
--   modere    : société active, conditions standard
--   eleve     : capital < 10k€ ou < 2 ans d'existence
--   procedure : BODACC procédure collective (signalé dans brh_bodacc_alerts)
--   cessation : date_radiation IS NOT NULL OR is_active = false
--   inconnu   : pas assez d'info
--
-- Affiché dans OwnerCard zone 2 (badge solvabilité) sur fiche adresse,
-- et dans le hero badges de FicheEntrepriseView.
-- =============================================================================

ALTER TABLE public.brh_sci_companies
  ADD COLUMN IF NOT EXISTS solvabilite_estimee TEXT;

ALTER TABLE public.brh_sci_companies
  DROP CONSTRAINT IF EXISTS brh_sci_companies_solvabilite_chk;

ALTER TABLE public.brh_sci_companies
  ADD CONSTRAINT brh_sci_companies_solvabilite_chk
  CHECK (solvabilite_estimee IS NULL OR solvabilite_estimee IN (
    'faible', 'modere', 'eleve', 'procedure', 'cessation', 'inconnu'
  ));

-- ----------------------------------------------------------------------------
-- Backfill 1 : cessation (radiée / inactive)
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET solvabilite_estimee = 'cessation'
WHERE solvabilite_estimee IS NULL
  AND (date_radiation IS NOT NULL OR is_active = false);

-- ----------------------------------------------------------------------------
-- Backfill 2 : procédure collective (si une alerte BODACC le signale)
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies sci
SET solvabilite_estimee = 'procedure'
FROM public.brh_bodacc_alerts b
WHERE sci.solvabilite_estimee IS NULL
  AND b.siren = sci.siren
  AND (
    LOWER(COALESCE(b.type_avis, '')) LIKE '%procedure%collective%'
    OR LOWER(COALESCE(b.type_avis, '')) LIKE '%redressement%'
    OR LOWER(COALESCE(b.type_avis, '')) LIKE '%liquidation%'
    OR LOWER(COALESCE(b.famille_avis, '')) LIKE '%procedure%'
  );

-- ----------------------------------------------------------------------------
-- Backfill 3 : élevé risque (capital très faible ou société très récente)
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET solvabilite_estimee = 'eleve'
WHERE solvabilite_estimee IS NULL
  AND is_active = true
  AND (
    (capital_social_cents IS NOT NULL AND capital_social_cents < 1000000) -- < 10 000 €
    OR (date_creation IS NOT NULL AND date_creation::DATE > (CURRENT_DATE - INTERVAL '2 years'))
  );

-- ----------------------------------------------------------------------------
-- Backfill 4 : faible risque (capital ≥ 100k€ + créée > 5 ans + active)
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET solvabilite_estimee = 'faible'
WHERE solvabilite_estimee IS NULL
  AND is_active = true
  AND capital_social_cents >= 10000000 -- 100 000 €
  AND date_creation IS NOT NULL
  AND date_creation::DATE < (CURRENT_DATE - INTERVAL '5 years');

-- ----------------------------------------------------------------------------
-- Backfill 5 : reste active = modere
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET solvabilite_estimee = 'modere'
WHERE solvabilite_estimee IS NULL
  AND is_active = true;

-- ----------------------------------------------------------------------------
-- Backfill 6 : reste = inconnu
-- ----------------------------------------------------------------------------
UPDATE public.brh_sci_companies
SET solvabilite_estimee = 'inconnu'
WHERE solvabilite_estimee IS NULL;

CREATE INDEX IF NOT EXISTS idx_brh_sci_companies_solvabilite
  ON public.brh_sci_companies (solvabilite_estimee)
  WHERE solvabilite_estimee IN ('procedure', 'cessation', 'eleve');

COMMENT ON COLUMN public.brh_sci_companies.solvabilite_estimee IS
  'Solvabilité estimée par heuristique : faible | modere | eleve | procedure | cessation | inconnu. Pattern Data-B (catégorie sémantique vs chiffre brut). Backfill 27/05.';
