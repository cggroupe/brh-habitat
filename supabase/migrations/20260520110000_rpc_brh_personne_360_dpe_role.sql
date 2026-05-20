-- 2026-05-20 — RPC brh_personne_360 v2 : enrichir adresses_liees avec
-- owner_name / owner_siren / dpe_role / employee_overrides.
--
-- CONTEXTE (cas Bodard François ↔ SCI La Colline) :
--   La RPC v1 (20260519150000) retournait pour chaque adresse DPE liée :
--     dpe_id, adresse, code_postal, commune, etiquette_dpe, surface, ...
--   sans dire si la personne est propriétaire OU simple occupant.
--   → Bodard apparaissait avec un DPE qu'il ne possède pas (la SCI le possède).
--
--   Cette v2 ajoute :
--     - owner_name        : nom du propriétaire (SCI ou particulier)
--     - owner_siren       : SIREN si SCI, NULL sinon
--     - dpe_role          : 'proprietaire' / 'dirigeant' / 'occupant'
--     - employee_overrides : surcharges employé par poste (lecture seule ici)
--
--   La fiche UI peut alors afficher un badge "Occupant (la SCI X détient)".

CREATE OR REPLACE FUNCTION public.brh_personne_360(
  p_personne_id uuid
)
RETURNS TABLE (
  identity jsonb,
  sci_dirigees jsonb,
  adresses_liees jsonb,
  mutations_dvf jsonb,
  bodacc_alerts jsonb,
  sci_deces_pairs jsonb,
  links_summary jsonb
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
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH
  -- 1. Identité complète
  ident AS (
    SELECT row_to_json(p.*)::jsonb AS j
    FROM public.brh_personnes_historique p
    WHERE p.id = p_personne_id
  ),
  -- 2. SIRENs des SCI dirigées (pour calcul dpe_role)
  sci_links AS (
    SELECT l.to_id AS siren, l.confidence, l.evidence
    FROM public.brh_entity_links l
    WHERE l.from_type = 'personne_brh'
      AND l.from_id = p_personne_id::text
      AND l.link_type = 'dirige'
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
        'departement', s.departement,
        'activite_libelle', s.activite_libelle,
        'capital_social_cents', s.capital_social_cents,
        'has_deceased_dirigeant', s.has_deceased_dirigeant,
        'confidence', l.confidence,
        'evidence', l.evidence
      ) ORDER BY s.date_creation DESC NULLS LAST
    ) AS j
    FROM sci_links l
    JOIN public.brh_sci_companies s ON s.siren::text = l.siren
  ),
  -- 3. Adresses DPE liées + role + propriétaire + overrides
  adresses_links AS (
    SELECT l.to_id AS dpe_id, l.confidence, l.evidence
    FROM public.brh_entity_links l
    WHERE l.from_type = 'personne_brh'
      AND l.from_id = p_personne_id::text
      AND l.link_type = 'habite'
  ),
  adresses_full AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'dpe_id', d.id,
        'adresse', d.adresse,
        'code_postal', d.code_postal,
        'commune', d.commune,
        'etiquette_dpe', d.etiquette_dpe,
        'surface_habitable', d.surface_habitable,
        'annee_construction', d.annee_construction,
        'score_v2', d.score_v2,
        'owner_name', d.owner_name,
        'owner_siren', d.owner_siren,
        'owner_type', d.owner_type,
        'dpe_role', CASE
          WHEN d.owner_siren IS NULL THEN 'proprietaire'
          WHEN EXISTS (
            SELECT 1 FROM sci_links sl WHERE sl.siren = d.owner_siren::text
          ) THEN 'dirigeant'
          ELSE 'occupant'
        END,
        'employee_overrides', COALESCE(d.employee_overrides, '{}'::jsonb),
        'confidence', l.confidence,
        'evidence', l.evidence
      ) ORDER BY l.confidence DESC, d.score_v2 DESC NULLS LAST
    ) AS j
    FROM adresses_links l
    JOIN public.brh_dpe_prospects d ON d.id::text = l.dpe_id
  ),
  -- 4. Mutations DVF transitives
  mutations_full AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', v.id,
        'date_mutation', v.date_mutation,
        'nature_mutation', v.nature_mutation,
        'valeur_fonciere_cents', v.valeur_fonciere_cents,
        'surface_reelle_bati', v.surface_reelle_bati,
        'type_local', v.type_local,
        'adresse', concat_ws(' ', v.adresse_numero, v.adresse_voie),
        'commune', v.commune,
        'prix_m2_calc', v.prix_m2_calc,
        'is_groupee', v.is_groupee,
        'usable_for_brh', v.usable_for_brh,
        'via_dpe_id', l2.from_id
      ) ORDER BY v.date_mutation DESC
    ) AS j
    FROM adresses_links l1
    JOIN public.brh_entity_links l2
      ON l2.from_type = 'adresse_dpe'
     AND l2.from_id = l1.dpe_id
     AND l2.link_type = 'a_mute'
    JOIN public.brh_dvf_archive v ON v.id::text = l2.to_id
  ),
  -- 5. BODACC sur les SCI dirigées
  bodacc_full AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id_bodacc', b.id_bodacc,
        'siren', b.siren,
        'date_publication', b.date_publication,
        'type_avis', b.type_avis,
        'famille_avis', b.famille_avis,
        'denomination', b.denomination,
        'prix_cession_cents', b.prix_cession_cents,
        'date_cession', b.date_cession,
        'bodacc_url', b.bodacc_url
      ) ORDER BY b.date_publication DESC NULLS LAST
    ) AS j
    FROM sci_links sl
    JOIN public.brh_bodacc_alerts b ON b.siren = sl.siren
  ),
  -- 6. SCI décès matchs
  deces_full AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'siren', m.siren,
        'nom', m.nom, 'prenom', m.prenom,
        'date_naissance', m.date_naissance,
        'deces_date', m.deces_date,
        'deces_commune', m.deces_commune,
        'match_confidence', m.match_confidence
      ) ORDER BY m.deces_date DESC NULLS LAST
    ) AS j
    FROM public.brh_sci_deces_matches m, public.brh_personnes_historique p
    WHERE p.id = p_personne_id
      AND m.match_found = TRUE
      AND p.nom IS NOT NULL AND p.prenom IS NOT NULL
      AND lower(m.nom) = lower(p.nom)
      AND lower(m.prenom) = lower(p.prenom)
  ),
  -- 7. Compteurs résumé
  summary AS (
    SELECT jsonb_object_agg(link_type, n) AS j
    FROM (
      SELECT link_type, COUNT(*) AS n
      FROM public.brh_entity_links
      WHERE from_type = 'personne_brh' AND from_id = p_personne_id::text
      GROUP BY link_type
    ) s
  )
  SELECT
    (SELECT j FROM ident),
    COALESCE((SELECT j FROM sci_full), '[]'::jsonb),
    COALESCE((SELECT j FROM adresses_full), '[]'::jsonb),
    COALESCE((SELECT j FROM mutations_full), '[]'::jsonb),
    COALESCE((SELECT j FROM bodacc_full), '[]'::jsonb),
    COALESCE((SELECT j FROM deces_full), '[]'::jsonb),
    COALESCE((SELECT j FROM summary), '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION public.brh_personne_360 IS
  '2026-05-20 v2 — Fiche personne 360°. adresses_liees enrichi avec owner_name/owner_siren/dpe_role/employee_overrides (distingue propriétaire/dirigeant/occupant cas SCI).';
