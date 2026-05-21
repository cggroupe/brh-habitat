-- 2026-05-21 — Phase 6B — RPC brh_dirigeant_360 v2 : ajout lat/lng dans dpe_detenus
--
-- CONTEXTE :
--   B7 partiel Phase 2D : la fiche dirigeant manquait une mini-carte des biens
--   pour visualiser le patrimoine SCI sur une carte. Pour l'activer, le RPC
--   doit retourner les coordonnées (lat, lng) avec chaque DPE détenu.
--
-- CHANGEMENT :
--   Le JSON `dpe_detenus` retourné par brh_dirigeant_360 gagne 2 champs :
--   - lat double precision
--   - lng double precision
--   Issus directement de brh_dpe_prospects.latitude/longitude (déjà
--   présents pour 99.97% des DPE).
--
-- BACKWARD COMPAT : ajout de champs JSON, aucun retrait. UI front existante
-- (qui ne lit pas lat/lng) continue de fonctionner.

CREATE OR REPLACE FUNCTION public.brh_dirigeant_360(p_dirigeant_id uuid)
RETURNS TABLE(identity jsonb, sci_details jsonb, dpe_detenus jsonb, bodacc_alerts jsonb)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
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
        'owner_name', dp.owner_name,
        'lat', dp.latitude,
        'lng', dp.longitude
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
