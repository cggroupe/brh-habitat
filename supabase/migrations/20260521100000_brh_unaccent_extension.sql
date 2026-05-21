-- 2026-05-21 — Phase 2A.M-1 — Extension unaccent + wrapper IMMUTABLE
--
-- CONTEXTE :
--   Audit Phase 1 (cf docs/wiki/matching-adresse.md) — sur dept 35, le match
--   strict naïf `lower(adresse) + code_postal` donne 0.8% de hits seulement
--   (4/528). Causes principales :
--     - DPE ADEME en CAPITALES avec particules : "14 RUE DE BUGEAUD"
--     - Client BRH mixed-case sans particule : "14 Rue Bugeaud"
--     - PPO 44 avec CP+ville+pays embedded : "16 RUE X 35720 BONNEMAIN France"
--   Et accents (é/è/à) jamais normalisés.
--
-- ACTION :
--   1. Installer l'extension Postgres `unaccent` (Supabase la fournit).
--   2. Créer un wrapper `f_unaccent(text)` marqué IMMUTABLE pour pouvoir
--      l'utiliser dans des colonnes générées STORED + index expression.
--      La fonction unaccent native est STABLE (techniquement la table peut
--      changer), mais en pratique le dictionnaire unaccent est figé →
--      IMMUTABLE est sûr et standard (cf doc Postgres officielle).
--
-- LIENS :
--   - Spec complète : docs/wiki/matching-adresse.md §5 (Migration M-1)
--   - Phase suivante M-2 : 20260521110000 (colonnes générées + index)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Installation extension
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Wrapper IMMUTABLE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.f_unaccent(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT extensions.unaccent('extensions.unaccent', input_text);
$$;

COMMENT ON FUNCTION public.f_unaccent(text) IS
  'Wrapper IMMUTABLE de extensions.unaccent. Utilisable dans colonnes générées STORED et index expression. Voir docs/wiki/matching-adresse.md §5.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Smoke test (lecture seule)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF public.f_unaccent('École de la Plage à Châteauneuf') <> 'Ecole de la Plage a Chateauneuf' THEN
    RAISE EXCEPTION 'f_unaccent test failed';
  END IF;
END $$;
