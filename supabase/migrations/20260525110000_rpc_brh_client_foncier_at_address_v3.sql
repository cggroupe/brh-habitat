-- =============================================================================
-- 2026-05-25 — Phase 1.3 : RPC brh_client_foncier_at_address v3 — JOIN BAN id
-- =============================================================================
--
-- CONTEXTE (handoff-2026-05-25.md suggestion #1) :
--   v1 (migration 20260521250000) matchait strictement DPE↔client via
--   (code_postal, numero_norm, voie_norm). Plafond observé : 419 matches sur
--   17 952 clients = 2.3 % de couverture.
--
--   Depuis le chantier BAN finalisé 24-25/05 :
--     - brh_personnes_historique : 91.9 % avec adresse_ban_id (16 740/18 218)
--     - brh_dpe_prospects : enrichissement en cours (Phase 1.2)
--
--   adresse_ban_id est la clé exacte unique d'adresse française (BAN gérée
--   par DGFiP/IGN). Quand 2 entités ont le même ban_id, elles sont à la même
--   adresse de manière certaine — fiabilité supérieure aux comparaisons
--   normalisées car immunisée aux variations d'écriture (1A vs 1bis, etc.).
--
-- STRATÉGIE v3 :
--   - Crée une nouvelle fonction brh_client_foncier_at_address_v3 (drop-in,
--     même signature). v1 conservée intacte pour roll-back instantané.
--   - Élargit le matching DPE :
--     CTE dpe = legacy strict (cp + num_norm + voie_norm) UNION ban_id match.
--     DISTINCT sur d.id pour éviter doublons (un DPE peut matcher les 2 voies).
--   - Élargit aussi la détection "locataire SCI" : si client.ban_id match
--     un DPE détenu par SCI dont client n'est pas dirigeant → tenant=true.
--   - DVF et permis inchangés (table sans ban_id côté DVF/permis pour l'instant).
--
-- IMPACT ATTENDU :
--   419 matches → potentiellement 5 000-15 000 sur les 16 740 clients avec
--   ban_id. Borne haute conditionnée à la couverture finale BAN DPE (~95 %).
--
-- BACKWARD COMPAT :
--   v1 NON modifiée (drop-only safe). Switch frontend dans Phase 1.4 via
--   un seul rename dans src/api/brh-client-foncier.ts.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_client_foncier_at_address_v3(
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
         p.numero_norm, p.voie_norm, p.adresse_ban_id
    INTO v_client
    FROM public.brh_personnes_historique p
   WHERE p.id = p_personne_id;

  IF v_client.id IS NULL THEN
    RETURN;
  END IF;

  -- Détection "locataire SCI" : DPE détenu par SCI à la même adresse
  -- (élargie au match ban_id) dont le client n'est PAS dirigeant.
  IF v_client.code_postal IS NOT NULL THEN
    SELECT d.owner_name, d.owner_siren
      INTO v_dpe_proprio_sci
      FROM public.brh_dpe_prospects d
     WHERE d.owner_siren IS NOT NULL
       AND (
         -- match legacy strict
         (v_client.numero_norm IS NOT NULL AND v_client.numero_norm <> ''
          AND v_client.voie_norm IS NOT NULL AND v_client.voie_norm <> ''
          AND d.code_postal = v_client.code_postal
          AND d.numero_norm = v_client.numero_norm
          AND d.voie_norm = v_client.voie_norm)
         OR
         -- match BAN id (immune aux variations d'écriture)
         (v_client.adresse_ban_id IS NOT NULL
          AND d.adresse_ban_id = v_client.adresse_ban_id)
       )
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
  -- DPE matchés : legacy strict OR ban_id, DISTINCT pour éviter doublons.
  dpe_raw AS (
    SELECT DISTINCT ON (d.id)
      d.id, d.numero_dpe, d.adresse, d.code_postal, d.commune,
      d.etiquette_dpe, d.surface_habitable, d.annee_construction,
      d.date_dpe, d.owner_siren, d.owner_name, d.owner_type
    FROM public.brh_dpe_prospects d
    WHERE
      -- match legacy strict (cp + num_norm + voie_norm)
      (v_client.code_postal IS NOT NULL
       AND d.code_postal = v_client.code_postal
       AND (
         (v_client.numero_norm IS NOT NULL AND v_client.numero_norm <> ''
          AND d.numero_norm = v_client.numero_norm
          AND d.voie_norm = v_client.voie_norm)
         OR
         ((v_client.numero_norm IS NULL OR v_client.numero_norm = '')
          AND (d.numero_norm IS NULL OR d.numero_norm = '')
          AND d.voie_norm = v_client.voie_norm)
       ))
      OR
      -- match BAN id
      (v_client.adresse_ban_id IS NOT NULL
       AND d.adresse_ban_id = v_client.adresse_ban_id)
  ),
  dpe AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'dpe_id', dr.id, 'numero_dpe', dr.numero_dpe, 'adresse', dr.adresse,
        'code_postal', dr.code_postal, 'commune', dr.commune,
        'etiquette_dpe', dr.etiquette_dpe, 'surface_habitable', dr.surface_habitable,
        'annee_construction', dr.annee_construction, 'date_dpe', dr.date_dpe,
        'owner_siren', dr.owner_siren, 'owner_name', dr.owner_name, 'owner_type', dr.owner_type,
        'role', CASE
          WHEN dr.owner_siren IS NULL THEN 'proprietaire_particulier'
          WHEN EXISTS (
            SELECT 1 FROM public.brh_entity_links l
            WHERE l.from_type = 'personne_brh' AND l.from_id = p_personne_id::text
              AND l.link_type = 'dirige' AND l.to_id = dr.owner_siren
          ) THEN 'dirigeant_sci'
          ELSE 'locataire_sci'
        END
      ) ORDER BY dr.etiquette_dpe ASC
    ) AS j
    FROM dpe_raw dr
  ),
  dvf AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', dvf.id, 'date_mutation', dvf.date_mutation,
        'nature_mutation', dvf.nature_mutation, 'valeur_fonciere', dvf.valeur_fonciere_cents,
        'prix_m2_calc', dvf.prix_m2_calc, 'is_groupee', dvf.is_groupee,
        'adresse_complete', dvf.adresse_voie, 'commune', dvf.commune,
        'type_local', dvf.type_local, 'surface_bati', dvf.surface_reelle_bati
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
  permis AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id_permis', pc.id_permis, 'type_permis', pc.type_permis,
        'nature_travaux', pc.nature_travaux, 'date_depot', pc.date_depot,
        'date_decision', pc.date_decision, 'decision', pc.decision,
        'surface_plancher_m2', pc.surface_plancher_m2,
        'nombre_logements_crees', pc.nombre_logements_crees,
        'adresse_complete', pc.adresse_complete, 'commune', pc.commune,
        'lat', pc.lat, 'lng', pc.lng
      ) ORDER BY pc.date_depot DESC NULLS LAST
    ) AS j
    FROM public.brh_permis_construire pc
    WHERE v_client.code_postal IS NOT NULL
      AND v_client.voie_norm IS NOT NULL AND v_client.voie_norm <> ''
      AND length(v_client.voie_norm) >= 4
      AND v_client.voie_norm NOT IN ('nc','na','x','xxx','fff','eas','hdos','boro','inconnu','non communique')
      AND pc.code_postal = v_client.code_postal
      AND pc.voie_norm = v_client.voie_norm
    LIMIT 10
  )
  SELECT
    jsonb_build_object(
      'adresse', v_client.adresse, 'code_postal', v_client.code_postal,
      'ville', v_client.ville, 'numero_norm', v_client.numero_norm,
      'voie_norm', v_client.voie_norm, 'adresse_ban_id', v_client.adresse_ban_id
    ),
    COALESCE((SELECT j FROM dpe), '[]'::jsonb),
    COALESCE((SELECT j FROM dvf), '[]'::jsonb),
    COALESCE((SELECT j FROM permis), '[]'::jsonb),
    v_is_tenant, v_sci_proprio;
END;
$$;

COMMENT ON FUNCTION public.brh_client_foncier_at_address_v3(uuid) IS
  'v3 (25/05) — Élargit DPE matching avec adresse_ban_id en plus du match strict (cp,num_norm,voie_norm). Légèrement plus lent que v1 (1 condition OR de plus, index ban_id utilisé), gain matches attendu 10×-30× sur clients avec ban_id. v1 conservée pour rollback.';

GRANT EXECUTE ON FUNCTION public.brh_client_foncier_at_address_v3(uuid) TO authenticated;
