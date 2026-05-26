-- =============================================================================
-- 2026-05-26 — brh_sci_search_dirigeant v4 : remonte is_utility
-- =============================================================================
--
-- Bug audit Opus : dirigeants ENEDIS apparaissaient propriétaires de 1100 DPE
-- via la jointure dirigeant → SCI → DPE. ENEDIS n'est PAS une SCI.
--
-- v4 : retourne `is_utility` pour permettre au JS de :
--   - garder le rôle (info publique vraie : "Mme X est au directoire d'ENEDIS")
--   - mais EXCLURE le patrimoine via cette entité (faux)
-- =============================================================================

DROP FUNCTION IF EXISTS public.brh_sci_search_dirigeant(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.brh_sci_search_dirigeant(p_name TEXT, p_limit INTEGER DEFAULT 15)
RETURNS TABLE (
  siren CHARACTER,
  denomination TEXT,
  dirigeants JSONB,
  is_active BOOLEAN,
  has_deceased_dirigeant BOOLEAN,
  commune TEXT,
  code_postal CHARACTER,
  is_utility BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT ON (s.siren)
    s.siren, s.denomination, s.dirigeants, s.is_active,
    s.has_deceased_dirigeant, s.commune, s.code_postal, s.is_utility
  FROM public.brh_dirigeants d
  INNER JOIN public.brh_dirigeant_sci ds ON ds.dirigeant_id = d.id
  INNER JOIN public.brh_sci_companies s ON s.siren = ds.siren
  WHERE p_name IS NOT NULL
    AND length(p_name) >= 2
    AND d.nom_norm = lower(regexp_replace(p_name, '[^a-zA-ZÀ-ÿ]', '', 'g'))
  ORDER BY s.siren, s.is_active DESC NULLS LAST, s.denomination
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.brh_sci_search_dirigeant(TEXT, INTEGER) IS
  'v4 26/05 — Remonte is_utility pour exclure patrimoine via utilities (ENEDIS, ORANGE, etc.)';
