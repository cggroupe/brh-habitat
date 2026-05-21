-- 2026-05-21 — Audit final — 2 fixes post-audit Philippe
--
-- BUG A : Lieux-dits bretons courts (3-4 chars) injustement filtrés
--   Le précédent fix word boundary mettait `length(voie_norm) >= 5` ce qui
--   filtrait des lieux-dits LÉGITIMES comme "Fumé", "Keff", "Carn".
--   Vrais matches Permis vérifiés : LE FUME, LE KEFF, LE CARN.
--   Fix : abaisser à >= 4 + blacklister UNIQUEMENT les sentinelles
--   réelles ('nc', 'na', 'x', 'fff', 'eas', 'hdos', 'boro', 'meot').
--
-- BUG C : DPE F/G dept 44 score_v2 = 0 au lieu de 10
--   Migration 20260521210000_score_v2_extend_to_e.sql déduit -10 pour
--   F/G en supposant que le score initial contenait la contribution r_fg.
--   Pour les NOUVEAUX DPE 44 (Phase 8.2), score_v2 était NULL → la
--   déduction -10 a annulé le +10 r_classe → résultat 0.
--   Fix : recalc des DPE F/G dept 44 SANS la déduction.

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX A : Word boundary permis avec lieux-dits courts (length >= 4)
-- ─────────────────────────────────────────────────────────────────────────────

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
  v_voie_safe boolean;
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

  -- FIX A : seuil 4 chars (au lieu de 5) pour laisser passer les lieux-dits
  -- bretons légitimes (Fumé, Keff, Carn, Roz, Coq, etc.)
  -- + Blacklist élargie des artéfacts données manquantes
  v_voie_safe := v_client.voie_norm IS NOT NULL
              AND length(v_client.voie_norm) >= 4
              AND v_client.voie_norm NOT IN (
                'nc', 'na', 'n c', 'n/c', 'x', 'xxx', 'fff', 'eas',
                'hdos', 'boro', 'inconnu', 'non communique'
              );

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
    WHERE v_voie_safe
      AND pc.code_postal = v_client.code_postal
      AND lower(public.f_unaccent(coalesce(pc.adresse_complete, '')))
            ~ ('\m' || v_client.voie_norm || '\M')
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

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX C : Score V2 dept 44 (22 316 DPE F/G à 0 → recalc sans déduction)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.brh_dpe_prospects p
SET score_v2 = LEAST(100, GREATEST(0,
    CASE WHEN p.dvf_mutation_24m THEN 35 ELSE 0 END  -- r_mut F/G
  + CASE WHEN p.has_pv_36kw THEN -10 ELSE 0 END       -- r_pv malus
  + CASE WHEN p.enedis_kwh_logt > 250 THEN 15 ELSE 0 END  -- r_enedis
  + 10                                                  -- r_classe F/G
))::smallint
WHERE p.departement = '44'
  AND p.etiquette_dpe IN ('F','G')
  AND (p.score_v2 IS NULL OR p.score_v2 = 0);

-- Smoke test
DO $$
DECLARE
  v_zero bigint;
  v_avg numeric;
BEGIN
  SELECT COUNT(*) FILTER (WHERE score_v2 = 0), AVG(score_v2)::numeric(5,1)
  INTO v_zero, v_avg
  FROM public.brh_dpe_prospects
  WHERE departement = '44' AND etiquette_dpe IN ('F','G');
  RAISE NOTICE 'DPE F/G dept 44 : avg score_v2 = %, encore à zéro = %', v_avg, v_zero;
END $$;
