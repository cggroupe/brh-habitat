-- 2026-05-21 — Phase 6D — RPC brh_client_foncier_at_address v2 : branchement permis Sitadel
--
-- CONTEXTE :
--   La migration 20260521160000 contenait un TODO pour le matching permis
--   tant que `brh_permis_construire` était vide. Cette table reste vide à
--   ce jour (import Sitadel en cours selon docs/wiki/data-inventory.md),
--   mais on prépare le branchement final pour qu'il fonctionne dès l'ingest
--   sans nouvelle migration.
--
-- CHANGEMENT :
--   permis_matches passe d'un placeholder `[]` à une vraie agrégation jsonb
--   qui matche `(code_postal, voie_norm)` sur la table permis si elle est
--   populée. Aucun risque tant que la table reste vide (jsonb_agg sur 0 row
--   retourne NULL, normalisé via COALESCE).
--
-- BACKWARD COMPAT : signature identique. Le front consomme `permis_matches`
-- comme un array vide aujourd'hui ; il aura automatiquement les permis quand
-- l'ingest Sitadel sera fini.
--
-- COLONNES MATCHÉES (cf schema brh_permis_construire, migration source) :
--   id_permis, type_permis, nature_travaux, date_depot, date_decision,
--   decision, surface_plancher_m2, nombre_logements_crees, lat, lng

CREATE OR REPLACE FUNCTION public.brh_client_foncier_at_address(
  p_personne_id uuid
)
RETURNS TABLE (
  client_address jsonb,
  dpe_matches jsonb,
  dvf_matches jsonb,
  permis_matches jsonb,
  is_tenant_of_sci boolean,
  sci_proprietaire jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
  v_client RECORD;
  v_is_tenant boolean := FALSE;
  v_sci_proprio jsonb := NULL;
  v_dpe_proprio_sci RECORD;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  SELECT p.id, p.adresse, p.code_postal, p.ville,
         p.numero_norm, p.voie_norm
    INTO v_client
    FROM public.brh_personnes_historique p
   WHERE p.id = p_personne_id;

  IF v_client.id IS NULL THEN
    RETURN;
  END IF;

  IF v_client.code_postal IS NOT NULL
     AND v_client.numero_norm IS NOT NULL AND v_client.numero_norm <> ''
     AND v_client.voie_norm IS NOT NULL AND v_client.voie_norm <> '' THEN
    SELECT d.owner_name, d.owner_siren
      INTO v_dpe_proprio_sci
      FROM public.brh_dpe_prospects d
     WHERE d.code_postal = v_client.code_postal
       AND d.numero_norm = v_client.numero_norm
       AND d.voie_norm  = v_client.voie_norm
       AND d.owner_siren IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.brh_entity_links l
         WHERE l.from_type = 'personne_brh'
           AND l.from_id = p_personne_id::text
           AND l.link_type = 'dirige'
           AND l.to_id = d.owner_siren
       )
     LIMIT 1;

    IF v_dpe_proprio_sci.owner_siren IS NOT NULL THEN
      v_is_tenant := TRUE;
      v_sci_proprio := jsonb_build_object(
        'name', v_dpe_proprio_sci.owner_name,
        'siren', v_dpe_proprio_sci.owner_siren
      );
    END IF;
  END IF;

  RETURN QUERY
  WITH
  dpe AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'dpe_id', d.id,
        'numero_dpe', d.numero_dpe,
        'adresse', d.adresse,
        'code_postal', d.code_postal,
        'commune', d.commune,
        'etiquette_dpe', d.etiquette_dpe,
        'surface_habitable', d.surface_habitable,
        'annee_construction', d.annee_construction,
        'date_dpe', d.date_dpe,
        'owner_siren', d.owner_siren,
        'owner_name', d.owner_name,
        'owner_type', d.owner_type,
        'role', CASE
          WHEN d.owner_siren IS NULL THEN 'proprietaire_particulier'
          WHEN EXISTS (
            SELECT 1 FROM public.brh_entity_links l
            WHERE l.from_type = 'personne_brh'
              AND l.from_id = p_personne_id::text
              AND l.link_type = 'dirige'
              AND l.to_id = d.owner_siren
          ) THEN 'dirigeant_sci'
          ELSE 'locataire_sci'
        END
      ) ORDER BY d.etiquette_dpe ASC
    ) AS j
    FROM public.brh_dpe_prospects d
    WHERE v_client.code_postal IS NOT NULL
      AND d.code_postal = v_client.code_postal
      AND (
        (v_client.numero_norm IS NOT NULL AND v_client.numero_norm <> ''
         AND d.numero_norm = v_client.numero_norm
         AND d.voie_norm = v_client.voie_norm)
        OR
        (v_client.numero_norm IS NULL OR v_client.numero_norm = '')
         AND (d.numero_norm IS NULL OR d.numero_norm = '')
         AND d.voie_norm = v_client.voie_norm
      )
  ),
  dvf AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', dvf.id,
        'date_mutation', dvf.date_mutation,
        'nature_mutation', dvf.nature_mutation,
        'valeur_fonciere', dvf.valeur_fonciere_cents,
        'prix_m2_calc', dvf.prix_m2_calc,
        'is_groupee', dvf.is_groupee,
        'adresse_complete', dvf.adresse_voie,
        'commune', dvf.commune,
        'type_local', dvf.type_local,
        'surface_bati', dvf.surface_reelle_bati
      ) ORDER BY dvf.date_mutation DESC NULLS LAST
    ) AS j
    FROM public.brh_dvf_archive dvf
    WHERE v_client.code_postal IS NOT NULL
      AND v_client.voie_norm IS NOT NULL AND v_client.voie_norm <> ''
      AND dvf.code_postal = v_client.code_postal
      AND lower(dvf.adresse_voie) = v_client.voie_norm
      AND dvf.usable_for_brh = TRUE
    LIMIT 20
  ),
  -- Phase 6D : branchement Sitadel (actif dès que brh_permis_construire est populée)
  permis AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id_permis', pc.id_permis,
        'type_permis', pc.type_permis,
        'nature_travaux', pc.nature_travaux,
        'date_depot', pc.date_depot,
        'date_decision', pc.date_decision,
        'decision', pc.decision,
        'surface_plancher_m2', pc.surface_plancher_m2,
        'nombre_logements_crees', pc.nombre_logements_crees,
        'adresse_complete', pc.adresse_complete,
        'commune', pc.commune,
        'lat', pc.lat,
        'lng', pc.lng
      ) ORDER BY pc.date_depot DESC NULLS LAST
    ) AS j
    FROM public.brh_permis_construire pc
    WHERE v_client.code_postal IS NOT NULL
      AND v_client.voie_norm IS NOT NULL AND v_client.voie_norm <> ''
      AND pc.code_postal = v_client.code_postal
      AND lower(public.f_unaccent(coalesce(pc.adresse_complete, ''))) LIKE '%' || v_client.voie_norm || '%'
    LIMIT 10
  )
  SELECT
    jsonb_build_object(
      'adresse', v_client.adresse,
      'code_postal', v_client.code_postal,
      'ville', v_client.ville,
      'numero_norm', v_client.numero_norm,
      'voie_norm', v_client.voie_norm
    ),
    COALESCE((SELECT j FROM dpe), '[]'::jsonb),
    COALESCE((SELECT j FROM dvf), '[]'::jsonb),
    COALESCE((SELECT j FROM permis), '[]'::jsonb),
    v_is_tenant,
    v_sci_proprio;
END;
$$;

COMMENT ON FUNCTION public.brh_client_foncier_at_address(uuid) IS
  'Phase 6D — Retourne le foncier à l''adresse client : DPE + DVF + PERMIS Sitadel (branché, actif dès ingest) + flag locataire SCI.';

-- Aucun GRANT à réémettre — déjà accordé Phase 3 (20260521160000).
