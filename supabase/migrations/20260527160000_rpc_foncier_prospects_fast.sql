-- =============================================================================
-- 2026-05-27 — RPC brh_foncier_prospects_fast : streaming initial sans count
-- =============================================================================
--
-- Le RPC `brh_foncier_prospects_unified` fait un count(*) sur 203k+ rows
-- avec JOINs sur 3 tables externes (brh_ext_commune, brh_ext_iris,
-- brh_lead_pii_enriched). Sans filtres, ça dépasse les 3s de timeout
-- statement_timeout → erreur "canceling statement due to statement timeout".
--
-- Cette version `_fast` :
--   - Ne calcule PAS total_count (économise le count(*) OVER)
--   - Hardcode limit max 30
--   - Garde les mêmes filtres + même check d'accès agence
--
-- Utilisée par le hook React pour le streaming initial (15 rows en <500ms).
-- Le `_unified` original continue à fournir le count exact en arrière-plan.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_foncier_prospects_fast(
  p_dept TEXT DEFAULT NULL,
  p_score_v2_min INTEGER DEFAULT 0,
  p_segment_v2 TEXT DEFAULT NULL,
  p_filter_fioul BOOLEAN DEFAULT FALSE,
  p_filter_avec_sci BOOLEAN DEFAULT FALSE,
  p_filter_succession BOOLEAN DEFAULT FALSE,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 15,
  p_filter_particulier BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id INTEGER,
  adresse TEXT,
  adresse_ban TEXT,
  commune VARCHAR,
  code_postal VARCHAR,
  departement VARCHAR,
  surface DOUBLE PRECISION,
  etiquette_dpe CHARACTER,
  annee_construction INTEGER,
  type_batiment VARCHAR,
  score_v2 SMALLINT,
  score_v2_segment TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  owner_siren TEXT,
  owner_name TEXT,
  pii_full_name TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT (
    public.brh_user_has_agence_access()
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
    )
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: requires active agence contract or pro/admin role'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.adresse_ban, p.adresse) AS adresse,
    p.adresse_ban,
    p.commune,
    p.code_postal,
    p.departement,
    p.surface_habitable AS surface,
    p.etiquette_dpe,
    p.annee_construction,
    p.type_batiment,
    p.score_v2,
    p.score_v2_segment,
    p.latitude,
    p.longitude,
    p.owner_siren,
    p.owner_name,
    pii.full_name AS pii_full_name
  FROM public.brh_dpe_prospects p
  LEFT JOIN public.brh_lead_pii_enriched pii ON pii.dpe_id = p.id
  WHERE p.iris_code IS NOT NULL
    AND p.score_v2 IS NOT NULL
    AND (p_dept IS NULL OR p.departement = p_dept)
    AND (p_score_v2_min = 0 OR p.score_v2 >= p_score_v2_min)
    AND (p_segment_v2 IS NULL OR p.score_v2_segment = p_segment_v2)
    AND (NOT p_filter_fioul OR p.energie_chauffage ILIKE '%fioul%')
    AND (NOT p_filter_avec_sci OR p.owner_siren IS NOT NULL)
    AND (NOT p_filter_particulier OR p.owner_siren IS NULL)
    AND (NOT p_filter_succession OR p.dpe_saut_s1 IS NOT NULL)
    AND (p_search IS NULL
         OR p.adresse ILIKE '%'||p_search||'%'
         OR p.adresse_ban ILIKE '%'||p_search||'%'
         OR p.commune ILIKE '%'||p_search||'%'
         OR p.owner_name ILIKE '%'||p_search||'%'
         OR p.owner_siren ILIKE '%'||p_search||'%')
  -- IMPORTANT : pas de NULLS LAST → permet d'utiliser l'index partiel
  -- brh_dpe_prospects_score_v2 (WHERE score_v2 IS NOT NULL). Avec NULLS LAST,
  -- Postgres fait un Parallel Seq Scan (7s+) au lieu d'un Index Scan (<500ms).
  -- Cf log.md 27/05 — bug timeout 3s "canceling statement due to statement timeout".
  ORDER BY p.score_v2 DESC
  LIMIT LEAST(p_limit, 30);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_foncier_prospects_fast(TEXT, INTEGER, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, INTEGER, BOOLEAN)
  TO authenticated, anon;

COMMENT ON FUNCTION public.brh_foncier_prospects_fast IS
  'Version rapide sans count + sans JOIN commune/iris pour streaming initial UnifiedLeadsView. Élimine timeout 3s.';
