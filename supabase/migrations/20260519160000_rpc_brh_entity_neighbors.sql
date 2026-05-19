-- 2026-05-19 — RPC générique brh_entity_neighbors : explore les voisins
-- de N'IMPORTE QUELLE entité du graphe (personne_brh, sci, adresse_dpe).
--
-- Utilisée par FicheAdresse, FicheEntreprise, FichePersonne pour afficher
-- un panel commun « Liens 360° » sans dupliquer la logique.

CREATE OR REPLACE FUNCTION public.brh_entity_neighbors(
  p_type text,
  p_id   text
)
RETURNS TABLE (
  direction text,         -- 'outgoing' | 'incoming'
  other_type text,
  other_id   text,
  link_type  text,
  confidence numeric,
  evidence   jsonb,
  display    jsonb         -- libellé court pour l'UI (denomination/full_name/adresse)
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
  WITH raw AS (
    SELECT 'outgoing'::text AS direction, l.to_type AS other_type, l.to_id AS other_id,
           l.link_type, l.confidence, l.evidence
    FROM public.brh_entity_links l
    WHERE l.from_type = p_type AND l.from_id = p_id
    UNION ALL
    SELECT 'incoming'::text, l.from_type, l.from_id, l.link_type, l.confidence, l.evidence
    FROM public.brh_entity_links l
    WHERE l.to_type = p_type AND l.to_id = p_id
  )
  SELECT
    r.direction, r.other_type, r.other_id, r.link_type, r.confidence, r.evidence,
    CASE r.other_type
      WHEN 'personne_brh' THEN (
        SELECT jsonb_build_object(
          'full_name', p.full_name,
          'societe', p.societe,
          'ville', p.ville,
          'enrichment_tier', p.enrichment_tier
        )
        FROM public.brh_personnes_historique p WHERE p.id::text = r.other_id
      )
      WHEN 'sci' THEN (
        SELECT jsonb_build_object(
          'denomination', s.denomination,
          'forme_juridique', s.forme_juridique,
          'commune', s.commune,
          'is_active', s.is_active,
          'has_deceased_dirigeant', s.has_deceased_dirigeant
        )
        FROM public.brh_sci_companies s WHERE s.siren::text = r.other_id
      )
      WHEN 'adresse_dpe' THEN (
        SELECT jsonb_build_object(
          'adresse', d.adresse,
          'code_postal', d.code_postal,
          'commune', d.commune,
          'etiquette_dpe', d.etiquette_dpe,
          'surface_habitable', d.surface_habitable,
          'score_v2', d.score_v2
        )
        FROM public.brh_dpe_prospects d WHERE d.id::text = r.other_id
      )
      WHEN 'mutation_dvf' THEN (
        SELECT jsonb_build_object(
          'date_mutation', v.date_mutation,
          'nature_mutation', v.nature_mutation,
          'valeur_fonciere_cents', v.valeur_fonciere_cents,
          'surface_reelle_bati', v.surface_reelle_bati,
          'type_local', v.type_local,
          'prix_m2_calc', v.prix_m2_calc,
          'is_groupee', v.is_groupee,
          'usable_for_brh', v.usable_for_brh,
          'commune', v.commune
        )
        FROM public.brh_dvf_archive v WHERE v.id::text = r.other_id
      )
      ELSE NULL
    END AS display
  FROM raw r
  ORDER BY r.confidence DESC, r.link_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_entity_neighbors(text, text) TO authenticated;

COMMENT ON FUNCTION public.brh_entity_neighbors IS
  '2026-05-19 — Voisins (outgoing+incoming) d''une entité dans brh_entity_links, avec display jsonb pour l''UI.';
