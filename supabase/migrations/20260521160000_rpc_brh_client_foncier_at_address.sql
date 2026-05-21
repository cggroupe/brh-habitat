-- 2026-05-21 — Phase 3 — RPC brh_client_foncier_at_address
--
-- CONTEXTE (cf docs/wiki/hub-client-brh.md §1) :
--   Demande Philippe : "Bien faire attention que ces informations [DPE à
--   l'adresse client] ne soient pas rattachées à une SCI — dans ces cas-là
--   le client est maintenant locataire du propriétaire."
--
--   Audit Phase 2A.6 (21/05) : 78 clients sur 17 952 ont une adresse qui
--   matche exactement un DPE détenu par SCI = cas Bodard généralisé.
--
-- LIVRABLE :
--   RPC qui pour un client_id retourne :
--   - dpe_matches[] : DPE F/G à l'adresse client (via matching strict Phase 2A)
--   - dvf_matches[] : mutations DVF à la même voie (16% hit rate)
--   - permis_matches[] : permis Sitadel (table vide actuellement → array vide)
--   - is_tenant_of_sci : flag boolean si client est locataire SCI
--   - sci_proprietaire : { name, siren } si is_tenant_of_sci
--
-- LIENS :
--   - Spec : docs/wiki/hub-client-brh.md §4
--   - Matching : docs/wiki/matching-adresse.md
--   - UI : src/pages/employe/EmployeClientBrhDetail.tsx

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
  -- 1. Vérification accès (admin/pro/employe)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  -- 2. Récupérer adresse client normalisée
  SELECT p.id, p.adresse, p.code_postal, p.ville,
         p.numero_norm, p.voie_norm
    INTO v_client
    FROM public.brh_personnes_historique p
   WHERE p.id = p_personne_id;

  IF v_client.id IS NULL THEN
    RETURN;
  END IF;

  -- 3. Détection "locataire SCI" : chercher un DPE matché à l'adresse
  --    détenu par une SCI dont le client n'est PAS dirigeant
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
         -- Pas dirigeant de cette SCI
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
  -- a. DPE F/G strictement matchés
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
        -- Match exact num + voie
        (v_client.numero_norm IS NOT NULL AND v_client.numero_norm <> ''
         AND d.numero_norm = v_client.numero_norm
         AND d.voie_norm = v_client.voie_norm)
        OR
        -- Match lieu-dit (voie seule)
        (v_client.numero_norm IS NULL OR v_client.numero_norm = '')
         AND (d.numero_norm IS NULL OR d.numero_norm = '')
         AND d.voie_norm = v_client.voie_norm
      )
  ),
  -- b. DVF — mutations à la même voie (16% hit rate audit Phase 2A.6)
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
  -- c. Permis de construire (Sitadel — table vide actuellement, futur P2)
  permis AS (
    SELECT '[]'::jsonb AS j WHERE NOT EXISTS (
      SELECT 1 FROM public.brh_permis_construire LIMIT 1
    )
    -- TODO : quand brh_permis_construire sera populée, ajouter ici la
    -- jointure équivalente sur (code_postal, voie_norm) [Phase 4]
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
  'Phase 3 — Retourne le foncier à l''adresse client : DPE F/G + DVF + permis matchés + flag locataire SCI. Utilise matching strict Phase 2A (cp + numero_norm + voie_norm). Cas Bodard : 78 clients en Bretagne badgeables. Voir docs/wiki/hub-client-brh.md.';

GRANT EXECUTE ON FUNCTION public.brh_client_foncier_at_address(uuid) TO authenticated;
