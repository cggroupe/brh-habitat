-- =============================================================================
-- 2026-05-26 — RPC brh_sci_search_dirigeant v3 : normalisation côté SQL
-- =============================================================================
--
-- Bug audit 25/05 PM : "MARIE-CHRISTINE AULAGNON (BADOUARD)" → "Aucun rôle".
-- Cause : la v2 (mig 20260525170000) faisait `nom_norm = LOWER(p_name)` qui
-- comparait "aulagnon (badouard)" à "aulagnonbadouard" stocké (parens strippés).
--
-- Fix : appliquer la MÊME normalisation que la colonne générée `nom_norm`
--       (cf mig 20260519240000 : `lower(regexp_replace(nom, '[^a-zA-ZÀ-ÿ]', '', 'g'))`).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_sci_search_dirigeant(p_name TEXT, p_limit INTEGER DEFAULT 15)
RETURNS TABLE (
  siren CHARACTER,
  denomination TEXT,
  dirigeants JSONB,
  is_active BOOLEAN,
  has_deceased_dirigeant BOOLEAN,
  commune TEXT,
  code_postal CHARACTER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ON (s.siren)
    s.siren, s.denomination, s.dirigeants, s.is_active,
    s.has_deceased_dirigeant, s.commune, s.code_postal
  FROM public.brh_dirigeants d
  INNER JOIN public.brh_dirigeant_sci ds ON ds.dirigeant_id = d.id
  INNER JOIN public.brh_sci_companies s ON s.siren = ds.siren
  WHERE p_name IS NOT NULL
    AND length(p_name) >= 2
    -- v3 : normalisation identique à `nom_norm` (lower + strip non-alpha).
    -- Permet de matcher "AULAGNON (BADOUARD)" depuis URL ou form.
    AND d.nom_norm = lower(regexp_replace(p_name, '[^a-zA-ZÀ-ÿ]', '', 'g'))
  ORDER BY s.siren, s.is_active DESC NULLS LAST, s.denomination
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.brh_sci_search_dirigeant(TEXT, INTEGER) IS
  'v3 26/05 — Normalise p_name (lower + strip non-alpha) pour matcher nom_norm. Fix bug parsing "X (Y)".';
