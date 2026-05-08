-- Phase 11.4 — Tableau Foncier Prospects + colonnes commune (Population + Cat-Nat)
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS population_2022 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS population_2016 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS population_2008 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS evolution_pop_16_22 NUMERIC(6,4);
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_total INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_inondation INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_tempete INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_secheresse INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_last_date TEXT;

-- RPC pour le tableau Foncier Prospects (paginé + filtré)
CREATE OR REPLACE FUNCTION brh_foncier_prospects_table(
  p_dept text DEFAULT NULL,
  p_score_v2_min smallint DEFAULT 0,
  p_segment_v2 text DEFAULT NULL,
  p_opah_only boolean DEFAULT FALSE,
  p_rga_fort_only boolean DEFAULT FALSE,
  p_tlv_tendue_only boolean DEFAULT FALSE,
  p_audits_dyna_only boolean DEFAULT FALSE,
  p_couleur_mpr text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id integer, adresse text, commune varchar, code_postal varchar, departement varchar,
  surface double precision, etiquette_dpe char, annee_construction integer,
  conso_m2_ep double precision, type_batiment varchar,
  score_v2 smallint, score_v2_segment text,
  iris_code char, code_insee_commune text,
  couleur_mpr text, decile_estime smallint,
  opah_active boolean, opah_type text,
  rga_alea text, radon_categorie smallint,
  tlv_tendue boolean, tlv_zonage text,
  audits_ademe_count integer,
  dvf_mutation_24m boolean, dvf_prix_m2 integer,
  total_count bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  WITH filtered AS (
    SELECT p.*, c.opah_active, c.opah_type, c.rga_alea, c.radon_categorie,
           c.tlv_tendue, c.tlv_zonage, c.audits_ademe_count,
           i.couleur_mpr, i.decile_estime
    FROM public.brh_dpe_prospects p
    LEFT JOIN public.brh_ext_commune c ON c.insee::text = substr(p.iris_code, 1, 5)
    LEFT JOIN public.brh_ext_iris i ON i.iris_code = p.iris_code
    WHERE p.iris_code IS NOT NULL
      AND p.score_v2 IS NOT NULL
      AND (p_dept IS NULL OR p.departement = p_dept)
      AND (p_score_v2_min = 0 OR p.score_v2 >= p_score_v2_min)
      AND (p_segment_v2 IS NULL OR p.score_v2_segment = p_segment_v2)
      AND (NOT p_opah_only OR c.opah_active = TRUE)
      AND (NOT p_rga_fort_only OR c.rga_alea = 'fort')
      AND (NOT p_tlv_tendue_only OR c.tlv_tendue = TRUE)
      AND (NOT p_audits_dyna_only OR c.audits_ademe_count > 100)
      AND (p_couleur_mpr IS NULL OR i.couleur_mpr = p_couleur_mpr)
      AND (p_search IS NULL OR p.adresse ILIKE '%'||p_search||'%' OR p.commune ILIKE '%'||p_search||'%')
  ),
  cnt AS (SELECT count(*) AS n FROM filtered)
  SELECT
    f.id, f.adresse, f.commune, f.code_postal, f.departement,
    f.surface_habitable, f.etiquette_dpe, f.annee_construction,
    f.conso_m2_ep, f.type_batiment,
    f.score_v2, f.score_v2_segment,
    f.iris_code, substr(f.iris_code, 1, 5),
    f.couleur_mpr, f.decile_estime,
    f.opah_active, f.opah_type,
    f.rga_alea, f.radon_categorie,
    f.tlv_tendue, f.tlv_zonage,
    f.audits_ademe_count,
    f.dvf_mutation_24m, f.dvf_prix_m2,
    cnt.n
  FROM filtered f, cnt
  ORDER BY f.score_v2 DESC NULLS LAST
  LIMIT LEAST(p_limit, 200)
  OFFSET GREATEST(0, p_offset);
$$;

GRANT EXECUTE ON FUNCTION brh_foncier_prospects_table TO authenticated;
COMMENT ON FUNCTION brh_foncier_prospects_table IS 'Phase 11.4 — Tableau prospects DPE F/G filtrable et paginé pour /agence/foncier/prospects';
