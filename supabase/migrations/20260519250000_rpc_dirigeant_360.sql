-- 2026-05-19 — RPC `brh_dirigeant_360(uuid)` : fiche dirigeant complète.
--
-- Retourne :
--  - identity (jsonb complet brh_dirigeants)
--  - sci_details : liste des SCI dirigées avec détails Sirene
--  - dpe_detenus : adresses DPE F/G détenues via les SCI
--  - bodacc : alertes sur les SCI dirigées
--
-- Cible : commerciaux BRH pour vue à 360° d'un dirigeant
-- (détecter gros patrimoines + successions ouvertes).

CREATE OR REPLACE FUNCTION public.brh_dirigeant_360(
  p_dirigeant_id uuid
)
RETURNS TABLE (
  identity jsonb,
  sci_details jsonb,
  dpe_detenus jsonb,
  bodacc_alerts jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
  v_sci_sirens text[];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  -- Extract SIREN list
  SELECT array_agg(sci->>'siren') INTO v_sci_sirens
  FROM public.brh_dirigeants d, jsonb_array_elements(d.sci_dirigees) sci
  WHERE d.id = p_dirigeant_id;

  RETURN QUERY
  WITH
  ident AS (
    SELECT row_to_json(d.*)::jsonb AS j
    FROM public.brh_dirigeants d WHERE d.id = p_dirigeant_id
  ),
  sci_full AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'siren', s.siren,
        'denomination', s.denomination,
        'forme_juridique', s.forme_juridique,
        'date_creation', s.date_creation,
        'date_radiation', s.date_radiation,
        'is_active', s.is_active,
        'adresse_complete', s.adresse_complete,
        'commune', s.commune,
        'activite_libelle', s.activite_libelle,
        'has_deceased_dirigeant', s.has_deceased_dirigeant,
        'nb_dpe_owned', (
          SELECT COUNT(*) FROM public.brh_dpe_prospects WHERE owner_siren = s.siren
        )
      ) ORDER BY s.date_creation DESC NULLS LAST
    ) AS j
    FROM public.brh_sci_companies s
    WHERE s.siren = ANY(v_sci_sirens)
  ),
  dpe_full AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'dpe_id', dp.id,
        'adresse', dp.adresse,
        'code_postal', dp.code_postal,
        'commune', dp.commune,
        'etiquette_dpe', dp.etiquette_dpe,
        'surface_habitable', dp.surface_habitable,
        'annee_construction', dp.annee_construction,
        'owner_siren', dp.owner_siren,
        'owner_name', dp.owner_name
      ) ORDER BY dp.score_v2 DESC NULLS LAST
    ) AS j
    FROM public.brh_dpe_prospects dp
    WHERE dp.owner_siren = ANY(v_sci_sirens)
    LIMIT 50
  ),
  bodacc_full AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id_bodacc', b.id_bodacc,
        'siren', b.siren,
        'date_publication', b.date_publication,
        'type_avis', b.type_avis,
        'denomination', b.denomination,
        'bodacc_url', b.bodacc_url
      ) ORDER BY b.date_publication DESC NULLS LAST
    ) AS j
    FROM public.brh_bodacc_alerts b
    WHERE b.siren = ANY(v_sci_sirens)
    LIMIT 20
  )
  SELECT
    (SELECT j FROM ident),
    COALESCE((SELECT j FROM sci_full), '[]'::jsonb),
    COALESCE((SELECT j FROM dpe_full), '[]'::jsonb),
    COALESCE((SELECT j FROM bodacc_full), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dirigeant_360(uuid) TO authenticated;

-- ============================================================
-- RPC `brh_dirigeants_search` : recherche/liste filtrable
-- ============================================================
CREATE OR REPLACE FUNCTION public.brh_dirigeants_search(
  p_query text DEFAULT NULL,
  p_dept text DEFAULT NULL,
  p_multi_sci boolean DEFAULT FALSE,
  p_proprio_dpe boolean DEFAULT FALSE,
  p_succession boolean DEFAULT FALSE,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nom text,
  prenom text,
  date_naissance date,
  nb_sci_dirigees int,
  nb_sci_actives int,
  nb_dpe_total int,
  est_decede boolean,
  succession_potentielle boolean,
  interet_brh text,
  sci_dirigees jsonb,
  total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT d.*
    FROM public.brh_dirigeants d
    WHERE (NOT p_multi_sci OR d.nb_sci_dirigees >= 2)
      AND (NOT p_proprio_dpe OR d.nb_dpe_total > 0)
      AND (NOT p_succession OR d.succession_potentielle)
      AND (
        p_query IS NULL OR p_query = ''
        OR d.nom_norm LIKE lower(p_query) || '%'
        OR d.prenom_norm LIKE lower(p_query) || '%'
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(d.sci_dirigees) sci
          WHERE lower(sci->>'denomination') LIKE '%' || lower(p_query) || '%'
        )
      )
      AND (
        p_dept IS NULL OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(d.sci_dirigees) sci
          JOIN public.brh_sci_companies s ON s.siren = (sci->>'siren')
          WHERE s.departement = p_dept
        )
      )
  ),
  cnt AS (SELECT COUNT(*) AS n FROM filtered)
  SELECT f.id, f.nom, f.prenom, f.date_naissance, f.nb_sci_dirigees, f.nb_sci_actives,
         f.nb_dpe_total, f.est_decede, f.succession_potentielle, f.interet_brh,
         f.sci_dirigees, cnt.n
  FROM filtered f, cnt
  ORDER BY f.nb_dpe_total DESC, f.nb_sci_dirigees DESC, f.nom
  LIMIT LEAST(p_limit, 200) OFFSET GREATEST(0, p_offset);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dirigeants_search(text, text, boolean, boolean, boolean, int, int) TO authenticated;

-- ============================================================
-- RPC update employé pour fiche dirigeant
-- ============================================================
CREATE OR REPLACE FUNCTION public.brh_dirigeant_update_employee(
  p_id uuid,
  p_patch jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;
  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  UPDATE public.brh_dirigeants
  SET
    osint_adresse_perso = CASE WHEN p_patch ? 'osint_adresse_perso'
      THEN NULLIF(p_patch->>'osint_adresse_perso','') ELSE osint_adresse_perso END,
    osint_telephone = CASE WHEN p_patch ? 'osint_telephone'
      THEN NULLIF(p_patch->>'osint_telephone','') ELSE osint_telephone END,
    osint_email = CASE WHEN p_patch ? 'osint_email'
      THEN NULLIF(p_patch->>'osint_email','') ELSE osint_email END,
    osint_linkedin = CASE WHEN p_patch ? 'osint_linkedin'
      THEN NULLIF(p_patch->>'osint_linkedin','') ELSE osint_linkedin END,
    employee_notes = CASE WHEN p_patch ? 'employee_notes'
      THEN NULLIF(p_patch->>'employee_notes','') ELSE employee_notes END,
    interet_brh = CASE WHEN p_patch ? 'interet_brh'
      THEN NULLIF(p_patch->>'interet_brh','') ELSE interet_brh END,
    derniere_visite_terrain = CASE WHEN p_patch ? 'derniere_visite_terrain'
      THEN NULLIF(p_patch->>'derniere_visite_terrain','')::date ELSE derniere_visite_terrain END,
    employee_updated_at = now(),
    employee_updated_by = v_uid,
    updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_dirigeant_update_employee(uuid, jsonb) TO authenticated;
