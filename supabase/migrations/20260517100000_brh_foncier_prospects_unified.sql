-- 2026-05-17 — Phase UX Refonte : RPC `brh_foncier_prospects_unified` (v2)
--
-- Étend le RPC `brh_foncier_prospects_table` avec :
--   - Coordonnées lat/lng (pour la vue carte UnifiedLeadsMap)
--   - Détails techniques DPE (ubat, qualite_isolation_*, type_ventilation, descriptions)
--   - Propriétaire personne morale (owner_siren, owner_name, owner_type)
--   - DVF historique (dvf_prix, dvf_date)
--   - Filtres avancés : fioul, avec SCI, succession (basé sur dpe_saut_s1 = signal vente proche)
--
-- L'ancien RPC `brh_foncier_prospects_table` reste intact (utilisé par /agence/foncier/prospects).
-- Le nouveau RPC est utilisé uniquement par les routes /leads-v2 (UnifiedLeadsView).
--
-- SECURITY INVOKER : passe par RLS de l'utilisateur (pas de bypass).

CREATE OR REPLACE FUNCTION brh_foncier_prospects_unified(
  p_dept text DEFAULT NULL,
  p_score_v2_min smallint DEFAULT 0,
  p_segment_v2 text DEFAULT NULL,
  p_filter_fioul boolean DEFAULT FALSE,
  p_filter_avec_sci boolean DEFAULT FALSE,
  p_filter_succession boolean DEFAULT FALSE,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  -- Colonnes du RPC original
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
  -- NOUVELLES colonnes pour UnifiedLeadsView/Map/Modal
  latitude double precision,
  longitude double precision,
  energie_chauffage text,
  owner_siren text,
  owner_name text,
  owner_type text,
  dvf_prix integer,
  dvf_date text,
  ubat double precision,
  qualite_isolation_murs text,
  type_ventilation text,
  description_chauffage text,
  description_ecs text,
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
      -- Filtres avancés UX refonte
      AND (NOT p_filter_fioul OR p.energie_chauffage ILIKE '%fioul%')
      AND (NOT p_filter_avec_sci OR p.owner_siren IS NOT NULL)
      -- dpe_saut_s1 est un JSONB descriptif (label/gestes/gain_pct/cep_projete)
      -- IS NOT NULL = un saut DPE significatif est calculable → signal renovation forte
      AND (NOT p_filter_succession OR p.dpe_saut_s1 IS NOT NULL)
      AND (p_search IS NULL
           OR p.adresse ILIKE '%'||p_search||'%'
           OR p.commune ILIKE '%'||p_search||'%'
           OR p.owner_name ILIKE '%'||p_search||'%'
           OR p.owner_siren ILIKE '%'||p_search||'%')
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
    -- Nouvelles colonnes
    f.latitude, f.longitude,
    f.energie_chauffage,
    f.owner_siren, f.owner_name, f.owner_type,
    f.dvf_prix, f.dvf_date,
    f.ubat,
    f.qualite_isolation_murs,
    f.type_ventilation,
    f.description_chauffage,
    f.description_ecs,
    cnt.n
  FROM filtered f, cnt
  ORDER BY f.score_v2 DESC NULLS LAST
  LIMIT LEAST(p_limit, 200)
  OFFSET GREATEST(0, p_offset);
$$;

GRANT EXECUTE ON FUNCTION brh_foncier_prospects_unified TO authenticated;
COMMENT ON FUNCTION brh_foncier_prospects_unified IS '2026-05-17 — RPC v2 : tableau prospects DPE unifié avec coords + détails techniques + filtres fioul/SCI/succession. Utilisé par /leads-v2 (UnifiedLeadsView).';
