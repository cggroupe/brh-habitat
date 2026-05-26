-- =============================================================================
-- 2026-05-27 — RPC brh_dpe_by_siren_paged : pagination + filtres serveur pour SCI géantes
-- =============================================================================
--
-- Pour les SCI avec 100+ DPE (ENEDIS 1100, BRH Habitat 136, Finistère Habitat 120…),
-- la pagination côté client ne suffit plus. Cette RPC :
--   - Paginate via p_limit / p_offset
--   - Filtre par commune (LIKE %x%) + DPE class (ANY ARRAY) + score range
--   - Retourne total_count pour PaginationInfo
--   - Index utilisés : idx_brh_dpe_owner_siren + idx_brh_dpe_etiquette_dpe
--
-- Utilisé par : src/components/leads/fiche/PatrimoineMassif.tsx
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_dpe_by_siren_paged(
  p_siren TEXT,
  p_commune TEXT DEFAULT NULL,
  p_etiquette_dpe TEXT[] DEFAULT NULL,
  p_score_min INT DEFAULT NULL,
  p_score_max INT DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  adresse TEXT,
  code_postal TEXT,
  commune TEXT,
  etiquette_dpe TEXT,
  surface_habitable DOUBLE PRECISION,
  annee_construction INTEGER,
  score_v2 SMALLINT,
  score_segment TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT
      p.id,
      p.adresse,
      p.code_postal,
      p.commune,
      p.etiquette_dpe,
      p.surface_habitable,
      p.annee_construction,
      p.score_v2,
      p.score_v2_segment
    FROM public.brh_dpe_prospects p
    WHERE p.owner_siren = p_siren
      AND (p_commune IS NULL OR p.commune ILIKE '%' || p_commune || '%')
      AND (p_etiquette_dpe IS NULL OR p.etiquette_dpe = ANY(p_etiquette_dpe))
      AND (p_score_min IS NULL OR p.score_v2 >= p_score_min)
      AND (p_score_max IS NULL OR p.score_v2 <= p_score_max)
  ),
  counted AS (
    SELECT COUNT(*)::BIGINT AS n FROM filtered
  )
  SELECT
    f.id,
    f.adresse::TEXT,
    f.code_postal::TEXT,
    f.commune::TEXT,
    f.etiquette_dpe::TEXT,
    f.surface_habitable,
    f.annee_construction,
    f.score_v2,
    f.score_v2_segment::TEXT AS score_segment,
    (SELECT n FROM counted) AS total_count
  FROM filtered f
  ORDER BY f.score_v2 DESC NULLS LAST, f.id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dpe_by_siren_paged(TEXT, TEXT, TEXT[], INT, INT, INT, INT)
  TO authenticated, anon;

COMMENT ON FUNCTION public.brh_dpe_by_siren_paged IS
  'Pagination + filtres serveur des DPE détenus par une SCI. Utilisé par PatrimoineMassif pour les SCI géantes (> 100 DPE).';

-- ----------------------------------------------------------------------------
-- RPC bonus : résumé par commune et DPE class pour le header de PatrimoineMassif
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_dpe_summary_by_siren(p_siren TEXT)
RETURNS TABLE (
  total BIGINT,
  by_commune JSONB,
  by_dpe_class JSONB,
  by_segment JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT commune, etiquette_dpe, score_v2_segment AS segment
    FROM public.brh_dpe_prospects
    WHERE owner_siren = p_siren
  ),
  totals AS (SELECT COUNT(*)::BIGINT AS n FROM base),
  per_commune AS (
    SELECT jsonb_object_agg(commune, n) AS j FROM (
      SELECT commune, COUNT(*)::BIGINT AS n
      FROM base
      WHERE commune IS NOT NULL
      GROUP BY commune
      ORDER BY n DESC
      LIMIT 20
    ) t
  ),
  per_dpe AS (
    SELECT jsonb_object_agg(etiquette_dpe, n) AS j FROM (
      SELECT etiquette_dpe, COUNT(*)::BIGINT AS n
      FROM base
      WHERE etiquette_dpe IS NOT NULL
      GROUP BY etiquette_dpe
    ) t
  ),
  per_seg AS (
    SELECT jsonb_object_agg(segment, n) AS j FROM (
      SELECT segment, COUNT(*)::BIGINT AS n
      FROM base
      WHERE segment IS NOT NULL
      GROUP BY segment
    ) t
  )
  SELECT
    (SELECT n FROM totals),
    COALESCE((SELECT j FROM per_commune), '{}'::jsonb),
    COALESCE((SELECT j FROM per_dpe), '{}'::jsonb),
    COALESCE((SELECT j FROM per_seg), '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dpe_summary_by_siren(TEXT)
  TO authenticated, anon;

COMMENT ON FUNCTION public.brh_dpe_summary_by_siren IS
  'Résumé statistique des DPE détenus par une SCI : total + top 20 communes + distribution DPE class + segments V2.';
