-- 2026-05-21 — Phase 7 — Fix voie_norm DPE prospects : strip CP+ville embedded
--
-- BUG DÉTECTÉ après ingestion 86 490 DPE classe E (Phase 7) :
--   Les adresses ADEME viennent au format "77 rue du Bot 29200 Brest"
--   (CP+ville embedded), alors que les F/G existants (avant Phase 7)
--   étaient propres : "14 rue PRAD KELLEN".
--
--   Conséquence : la colonne générée voie_norm contient "rue du bot 29200
--   brest" au lieu de "rue du bot" → 0 match clients BRH sur DPE classe E.
--
--   La colonne voie_norm de brh_personnes_historique fait DÉJÀ le strip
--   correctement (regex avec \d{5}\s*[a-z][a-z\s\-]*\s*(france|fr)?\s*$).
--   Il faut harmoniser brh_dpe_prospects.
--
-- FIX :
--   DROP + RECREATE les 3 colonnes générées (adresse_norm, numero_norm,
--   voie_norm) avec le regex amélioré identique à brh_personnes_historique.
--   Les colonnes STORED se recalculent automatiquement à la création.
--   Les 5 index dépendants sont récréés ensuite.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. DROP index dépendants (sinon ALTER COLUMN refuse)
-- ─────────────────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.idx_brh_dpe_prospects_match;
DROP INDEX IF EXISTS public.idx_brh_dpe_prospects_voie_only;
DROP INDEX IF EXISTS public.idx_brh_dpe_prospects_cp;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DROP colonnes générées erronées
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brh_dpe_prospects
  DROP COLUMN IF EXISTS adresse_norm,
  DROP COLUMN IF EXISTS numero_norm,
  DROP COLUMN IF EXISTS voie_norm;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RECREATE avec regex amélioré (même que brh_personnes_historique)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brh_dpe_prospects
  ADD COLUMN adresse_norm text
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
  ADD COLUMN numero_norm text
    GENERATED ALWAYS AS (
      lower(substring(
        coalesce(adresse, '')
        FROM '^\s*(\d+(?:[a-zA-Z]|\s*(?:bis|ter|quater))?)'
      ))
    ) STORED,
  ADD COLUMN voie_norm text
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

COMMENT ON COLUMN public.brh_dpe_prospects.voie_norm IS
  'Voie normalisée (lower + unaccent + suppression CP+ville+pays embedded). Harmonisé Phase 7 avec brh_personnes_historique.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RECREATE index
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_brh_dpe_prospects_match
  ON public.brh_dpe_prospects (code_postal, numero_norm, voie_norm);

CREATE INDEX idx_brh_dpe_prospects_voie_only
  ON public.brh_dpe_prospects (code_postal, voie_norm)
  WHERE numero_norm IS NULL OR numero_norm = '';

CREATE INDEX idx_brh_dpe_prospects_cp
  ON public.brh_dpe_prospects (code_postal);
