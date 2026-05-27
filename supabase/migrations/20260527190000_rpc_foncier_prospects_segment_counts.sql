-- =============================================================================
-- 2026-05-27 — RPC brh_foncier_prospects_segment_counts
-- =============================================================================
--
-- Bug UnifiedLeadsView : les KPI cards (Total/Ultra/MPR/Standard) calculaient
-- les counts par segment sur les 50 rows de la page courante au lieu du total
-- réel en DB → "0 ultra chauds, 14 MPR, 36 standard" alors qu'on a 5 705 MPR
-- et 69 967 Standard en réalité (et vraiment 0 ultra_chaud).
--
-- Fix : RPC dédiée qui retourne les counts par segment avec les mêmes filtres
-- que brh_foncier_prospects_unified (mais sans segment et sans pagination).
-- Utilisée en parallèle du fetch de la liste pour afficher les vrais totaux.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_foncier_prospects_segment_counts(
  p_dept TEXT DEFAULT NULL,
  p_score_v2_min INTEGER DEFAULT 0,
  p_filter_fioul BOOLEAN DEFAULT FALSE,
  p_filter_avec_sci BOOLEAN DEFAULT FALSE,
  p_filter_particulier BOOLEAN DEFAULT FALSE,
  p_filter_succession BOOLEAN DEFAULT FALSE,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  segment TEXT,
  count BIGINT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (public.brh_user_has_agence_access() OR EXISTS (
    SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid()
      AND pr.role = ANY(ARRAY['admin','pro','employe']::text[])
  )) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT COALESCE(p.score_v2_segment, 'unknown')::TEXT AS segment, count(*)::BIGINT
  FROM public.brh_dpe_prospects p
  WHERE p.iris_code IS NOT NULL
    AND p.score_v2 IS NOT NULL
    AND (p_dept IS NULL OR p.departement = p_dept)
    AND (p_score_v2_min = 0 OR p.score_v2 >= p_score_v2_min)
    AND (NOT p_filter_fioul OR p.energie_chauffage ILIKE '%fioul%')
    AND (NOT p_filter_avec_sci OR p.owner_siren IS NOT NULL)
    AND (NOT p_filter_particulier OR p.owner_siren IS NULL)
    AND (NOT p_filter_succession OR p.dpe_saut_s1 IS NOT NULL)
    AND (p_search IS NULL
         OR p.adresse ILIKE '%'||p_search||'%'
         OR p.adresse_ban ILIKE '%'||p_search||'%'
         OR p.commune ILIKE '%'||p_search||'%'
         OR p.owner_name ILIKE '%'||p_search||'%')
  GROUP BY p.score_v2_segment;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_foncier_prospects_segment_counts(TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT)
  TO authenticated, anon;

COMMENT ON FUNCTION public.brh_foncier_prospects_segment_counts IS
  'Counts vrais des prospects par score_v2_segment (ultra_chaud/mpr_bleu_prio/standard/cold) avec mêmes filtres que brh_foncier_prospects_unified. Utilisé par les KPI cards UnifiedLeadsView.';
