-- =============================================================================
-- 2026-05-25 PM v2 — Fix perf brh_sci_search_dirigeant (vrai fix)
-- =============================================================================
--
-- La v1 (migration 20260525160000) utilisait IN (SELECT ...) qui produisait
-- un plan Nested Loop Semi Join INVERSÉ : scan complet brh_sci_companies
-- (36 491 rows) puis nested loop. Temps : 4.3s.
--
-- v2 : INNER JOIN explicite à partir de brh_dirigeants (index nom_norm).
-- Le planner part de la table la plus sélective.
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
    -- nom_norm est déjà en lowercase (cf brh_dirigeants ingest pipeline).
    -- LOWER(nom_norm) bypassait l'index → seq scan 5s. Match direct = 7ms.
    AND d.nom_norm = LOWER(p_name)
  ORDER BY s.siren, s.is_active DESC NULLS LAST, s.denomination
  LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.brh_sci_search_dirigeant(TEXT, INTEGER) IS
  'Phase 25/05 PM v2 — INNER JOIN explicite depuis brh_dirigeants (index nom_norm) au lieu de IN (SELECT) qui inversait le plan. 4.3s → <50ms attendu.';
