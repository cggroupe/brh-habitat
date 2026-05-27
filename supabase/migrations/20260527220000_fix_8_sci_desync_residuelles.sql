-- =============================================================================
-- 2026-05-27 — Fix 8 SCI résiduelles désync JSONB (edge case session 27/05)
-- =============================================================================
--
-- Contexte : la migration 20260527170000 (resync_brh_dirigeants_jsonb) a synchro
-- 99,6 % des SCI. Il restait 8 SCI dont aucun dirigeant n'a pu être inséré dans
-- brh_dirigeants à cause de noms parasites :
--   - 7 SCI avec dirigeants "sociétés" mal-parsées par le scraper SIRENE
--     (`K FONCIERE`, `85 PRISCA`, `35 CTH` ×2, `P SCI LES 4`, `22 TP INVEST`,
--     `2000 SA CONSTRUCTION`, "" "")
--   - 1 SCI BLAUNE avec un vrai dirigeant `* LAUNE MICHEL ROGER HENRI` né
--     1948-09-01 (le `*` est un préfixe parasite SIRENE qu'on retire)
--
-- Stratégie :
--   1. Ajouter `brh_sci_companies.dirigeants_jsonb_malformed boolean DEFAULT false`
--   2. Flag = true sur les 7 SCI vraiment poubelles (RPC/UI peuvent les masquer)
--   3. Récupérer le vrai dirigeant `LAUNE Michel Roger Henri` pour SCI BLAUNE
--      + lier via brh_dirigeant_sci
--
-- Idempotente : ON CONFLICT DO NOTHING + IF NOT EXISTS.
-- =============================================================================

-- 1) Flag column
ALTER TABLE public.brh_sci_companies
  ADD COLUMN IF NOT EXISTS dirigeants_jsonb_malformed boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS brh_sci_companies_jsonb_malformed_idx
  ON public.brh_sci_companies (dirigeants_jsonb_malformed)
  WHERE dirigeants_jsonb_malformed = true;

COMMENT ON COLUMN public.brh_sci_companies.dirigeants_jsonb_malformed IS
  '2026-05-27 — true si les dirigeants JSONB sont mal-parsés (sociétés taggées comme personnes, codes parasites, etc.) et donc inutilisables. RPC/UI peuvent filtrer.';

-- 2) Flag les 7 SCI poubelles (vraies sociétés-dirigeants mal-parsées)
UPDATE public.brh_sci_companies
SET dirigeants_jsonb_malformed = true
WHERE siren IN (
  '448085506',  -- SCI DE L ILE VIERGE : "K FONCIERE"
  '377892153',  -- SCI CONTREPOINT 5  : "85 PRISCA"
  '809670037',  -- SCI LACROSSA       : "35 CTH"
  '420500894',  -- SCI 5 RUE COLBERT  : "35 CTH"
  '914209960',  -- LES BECASSES       : "P SCI LES 4" + "22 TP INVEST"
  '328886288',  -- SCI DU 12 RUE DANTON : "2000 SA CONSTRUCTION"
  '949890982'   -- DE VOS             : nom et prenom vides
);

-- 3) Récupère le vrai dirigeant de SCI BLAUNE (siren 338017213)
-- → LAUNE Michel Roger Henri, né 1948-09-01, gérant
INSERT INTO public.brh_dirigeants (nom, prenom, date_naissance, est_decede, deces_date)
VALUES ('LAUNE', 'MICHEL ROGER HENRI', '1948-09-01', false, NULL)
ON CONFLICT (nom_norm, prenom_norm, date_naissance) DO NOTHING;

-- Lien brh_dirigeant_sci (besoin de l'id du dirigeant nouvellement inséré)
INSERT INTO public.brh_dirigeant_sci (dirigeant_id, siren, qualite)
SELECT d.id, '338017213', 'Gérant'
FROM public.brh_dirigeants d
WHERE d.nom_norm = 'laune'
  AND d.prenom_norm = 'michelrogerhenri'
  AND d.date_naissance = '1948-09-01'
ON CONFLICT (dirigeant_id, siren) DO NOTHING;

-- 4) On corrige aussi le JSONB de SCI BLAUNE pour retirer le `*` parasite
-- (immutable normalement, mais c'est un bug de parsing connu, et le payload
-- corrigé reflète la réalité légale du KBIS — pas une mutation de source).
UPDATE public.brh_sci_companies
SET dirigeants = jsonb_build_array(
  jsonb_build_object(
    'nom', 'LAUNE',
    'prenom', 'MICHEL ROGER HENRI',
    'qualite', 'Gérant',
    'est_decede', false,
    'deces_date', NULL,
    'deces_commune', NULL,
    'date_naissance', '1948-09-01',
    'deces_match_score', 0
  )
)
WHERE siren = '338017213';
