-- 2026-05-18 — RPC v4 : ajoute les colonnes PII enrichies (LEFT JOIN brh_lead_pii_enriched).
--
-- Permet à la liste leads V2 d'afficher le nom + téléphone + email des
-- particuliers BRH dont l'adresse a été matchée (script brh-import-pii.py).
-- RGPD : le front (lead-visibility.ts) filtre selon le profil — seuls les
-- employés BRH voient le téléphone/email particulier.

DROP FUNCTION IF EXISTS brh_foncier_prospects_unified(
  text, integer, text, boolean, boolean, boolean, text, integer, integer, boolean
);

CREATE OR REPLACE FUNCTION brh_foncier_prospects_unified(
  p_dept text DEFAULT NULL,
  p_score_v2_min integer DEFAULT 0,
  p_segment_v2 text DEFAULT NULL,
  p_filter_fioul boolean DEFAULT FALSE,
  p_filter_avec_sci boolean DEFAULT FALSE,
  p_filter_succession boolean DEFAULT FALSE,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_filter_particulier boolean DEFAULT FALSE
)
RETURNS TABLE (
  id integer, adresse text, adresse_ban text,
  commune varchar, code_postal varchar, departement varchar,
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
  -- Nouvelles colonnes PII (v4)
  pii_full_name text,
  pii_telephone text,
  pii_email text,
  pii_ca_total_eur integer,
  pii_source text,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
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
  WITH filtered AS (
    SELECT p.*, c.opah_active, c.opah_type, c.rga_alea, c.radon_categorie,
           c.tlv_tendue, c.tlv_zonage, c.audits_ademe_count,
           i.couleur_mpr, i.decile_estime,
           pii.full_name AS pii_full_name,
           pii.telephone AS pii_telephone,
           pii.email AS pii_email,
           pii.ca_total_eur AS pii_ca_total_eur,
           pii.source AS pii_source
    FROM public.brh_dpe_prospects p
    LEFT JOIN public.brh_ext_commune c ON c.insee::text = substr(p.iris_code, 1, 5)
    LEFT JOIN public.brh_ext_iris i ON i.iris_code = p.iris_code
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
  ),
  cnt AS (SELECT count(*) AS n FROM filtered)
  SELECT
    f.id,
    COALESCE(f.adresse_ban, f.adresse) AS adresse,
    f.adresse_ban,
    f.commune, f.code_postal, f.departement,
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
    f.latitude, f.longitude,
    f.energie_chauffage::text,
    f.owner_siren, f.owner_name, f.owner_type,
    f.dvf_prix, f.dvf_date,
    f.ubat,
    f.qualite_isolation_murs,
    f.type_ventilation,
    f.description_chauffage,
    f.description_ecs,
    f.pii_full_name,
    f.pii_telephone,
    f.pii_email,
    f.pii_ca_total_eur,
    f.pii_source,
    cnt.n
  FROM filtered f, cnt
  ORDER BY f.score_v2 DESC NULLS LAST
  LIMIT LEAST(p_limit, 200)
  OFFSET GREATEST(0, p_offset);
END;
$$;

GRANT EXECUTE ON FUNCTION brh_foncier_prospects_unified(
  text, integer, text, boolean, boolean, boolean, text, integer, integer, boolean
) TO authenticated;
