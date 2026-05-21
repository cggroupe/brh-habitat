-- 2026-05-21 — Phase 2A.M-2 — Colonnes adresse normalisées + index
--
-- CONTEXTE :
--   Suite à M-1 (20260521100000_brh_unaccent_extension), on dispose de
--   f_unaccent() IMMUTABLE. On peut maintenant ajouter des colonnes générées
--   STORED qui contiennent la version normalisée de l'adresse, et les indexer.
--
--   Spec normalisation (docs/wiki/matching-adresse.md §3) :
--     1. lower
--     2. f_unaccent (accents → ASCII)
--     3. Suppression suffixe pays "france"/"fr"
--     4. Espaces multiples → 1
--     5. Trim
--   Clé canonique : (code_postal, numero_norm, voie_norm)
--     - numero_norm : "^\d+(\s*(?:bis|ter|quater|[a-z]))?"
--     - voie_norm   : reste après numéro
--
--   ⚠️ L'expansion d'abréviations (r → rue, av → avenue, etc.) NE peut PAS
--   être faite en colonne générée (impl. plpgsql nécessaire). C'est traité
--   en M-3 via RPC `brh_normalize_adresse` (option B retenue, cf spec §5.M-3).
--   Les colonnes STORED ici font la normalisation "Postgres-pure" — l'index
--   accélère 80% des cas. Le 20% restant (abréviations) est résolu côté RPC.
--
-- TABLES IMPACTÉES :
--   - brh_dpe_prospects        (59 306 rows)
--   - brh_personnes_historique (18 571 rows)
--
-- Les autres tables (brh_dvf_archive, brh_sci_companies siège, brh_bdnb_*
-- futur) seront traitées en migrations séparées si besoin — pour l'instant
-- elles ont déjà des index `code_postal + lower(adresse_voie)` (DVF) ou
-- ne sont pas la cible immédiate.
--
-- LIENS :
--   - Spec : docs/wiki/matching-adresse.md §5 (Migration M-2)
--   - Suivant : 20260521120000 (RPC normalize + match)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. brh_dpe_prospects — colonnes normalisées + index
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brh_dpe_prospects
  ADD COLUMN IF NOT EXISTS adresse_norm text
    GENERATED ALWAYS AS (
      trim(regexp_replace(
        regexp_replace(
          lower(public.f_unaccent(coalesce(adresse, ''))),
          '\s*(france|fr)\s*$', '', 'i'
        ),
        '\s+', ' ', 'g'
      ))
    ) STORED,
  ADD COLUMN IF NOT EXISTS numero_norm text
    GENERATED ALWAYS AS (
      lower(substring(
        coalesce(adresse, '')
        FROM '^\s*(\d+(?:[a-zA-Z]|\s*(?:bis|ter|quater))?)'
      ))
    ) STORED,
  ADD COLUMN IF NOT EXISTS voie_norm text
    GENERATED ALWAYS AS (
      trim(regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(public.f_unaccent(coalesce(adresse, ''))),
            '^\s*\d+(?:[a-zA-Z]|\s*(?:bis|ter|quater))?\s*', '', 'i'
          ),
          '\s*(france|fr)\s*$', '', 'i'
        ),
        '\s+', ' ', 'g'
      ))
    ) STORED;

COMMENT ON COLUMN public.brh_dpe_prospects.adresse_norm IS
  'Adresse normalisée (lower+unaccent+trim, France/FR retiré, espaces normalisés). Voir docs/wiki/matching-adresse.md §3.';
COMMENT ON COLUMN public.brh_dpe_prospects.numero_norm IS
  'Numéro de rue extrait + suffixe lettré (bis/ter/A). NULL si absent (lieu-dit).';
COMMENT ON COLUMN public.brh_dpe_prospects.voie_norm IS
  'Nom de voie normalisé (sans numéro initial, sans suffixe pays). Inclut particules de/du/la (cf §3.4).';

CREATE INDEX IF NOT EXISTS idx_brh_dpe_prospects_match
  ON public.brh_dpe_prospects (code_postal, numero_norm, voie_norm);

CREATE INDEX IF NOT EXISTS idx_brh_dpe_prospects_voie_only
  ON public.brh_dpe_prospects (code_postal, voie_norm)
  WHERE numero_norm IS NULL OR numero_norm = '';

CREATE INDEX IF NOT EXISTS idx_brh_dpe_prospects_cp
  ON public.brh_dpe_prospects (code_postal);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. brh_personnes_historique — colonnes normalisées + index
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brh_personnes_historique
  ADD COLUMN IF NOT EXISTS adresse_norm text
    GENERATED ALWAYS AS (
      trim(regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(public.f_unaccent(coalesce(adresse, ''))),
            '\s*\d{5}\s*[a-z][a-z\s\-]*\s*(france|fr)?\s*$', '', 'i'
          ),
          '\s*(france|fr)\s*$', '', 'i'
        ),
        '\s+', ' ', 'g'
      ))
    ) STORED,
  ADD COLUMN IF NOT EXISTS numero_norm text
    GENERATED ALWAYS AS (
      lower(substring(
        coalesce(adresse, '')
        FROM '^\s*(\d+(?:[a-zA-Z]|\s*(?:bis|ter|quater))?)'
      ))
    ) STORED,
  ADD COLUMN IF NOT EXISTS voie_norm text
    GENERATED ALWAYS AS (
      trim(regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(public.f_unaccent(coalesce(adresse, ''))),
              '\s*\d{5}\s*[a-z][a-z\s\-]*\s*(france|fr)?\s*$', '', 'i'
            ),
            '^\s*\d+(?:[a-zA-Z]|\s*(?:bis|ter|quater))?\s*', '', 'i'
          ),
          '\s*(france|fr)\s*$', '', 'i'
        ),
        '\s+', ' ', 'g'
      ))
    ) STORED;

COMMENT ON COLUMN public.brh_personnes_historique.adresse_norm IS
  'Adresse normalisée. Nettoyage supplémentaire vs DPE : suppression CP+ville+pays embedded (cas PPO 44 type "X 35720 BONNEMAIN France").';
COMMENT ON COLUMN public.brh_personnes_historique.numero_norm IS
  'Numéro de rue extrait + suffixe lettré. NULL si absent (lieu-dit).';
COMMENT ON COLUMN public.brh_personnes_historique.voie_norm IS
  'Nom de voie normalisé (sans num initial, sans CP/ville/pays embedded).';

CREATE INDEX IF NOT EXISTS idx_brh_personnes_historique_match
  ON public.brh_personnes_historique (code_postal, numero_norm, voie_norm);

CREATE INDEX IF NOT EXISTS idx_brh_personnes_historique_voie_only
  ON public.brh_personnes_historique (code_postal, voie_norm)
  WHERE numero_norm IS NULL OR numero_norm = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Smoke test (lecture)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_dpe_count int;
  v_pers_count int;
BEGIN
  SELECT count(*) INTO v_dpe_count FROM public.brh_dpe_prospects WHERE adresse_norm IS NOT NULL;
  SELECT count(*) INTO v_pers_count FROM public.brh_personnes_historique WHERE adresse_norm IS NOT NULL;
  RAISE NOTICE 'brh_dpe_prospects adresse_norm: % rows | brh_personnes_historique adresse_norm: % rows', v_dpe_count, v_pers_count;
END $$;
