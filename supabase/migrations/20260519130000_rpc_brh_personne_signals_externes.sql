-- 2026-05-19 — RPC pour récupérer les signaux externes (DVF, SCI décès, BODACC)
-- attachés à un contact brh_personnes_historique.
--
-- Une seule RPC qui retourne 3 listes pour limiter le nombre de roundtrips
-- réseau côté UI (1 appel = tous les signaux).

CREATE OR REPLACE FUNCTION public.brh_personne_signals_externes(
  p_personne_id uuid
)
RETURNS TABLE (
  dvf_mutations jsonb,
  sci_deces_matches jsonb,
  bodacc_alerts jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_has_access boolean;
  v_personne public.brh_personnes_historique%ROWTYPE;
  v_voie_norm text;
BEGIN
  -- Accès BRH interne uniquement
  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
  ) INTO v_has_access;

  IF NOT v_has_access THEN
    RAISE EXCEPTION 'Access denied: brh internal staff only'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_personne FROM public.brh_personnes_historique
  WHERE id = p_personne_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_voie_norm := lower(regexp_replace(COALESCE(v_personne.adresse, ''), '^[0-9]+\s*', ''));

  RETURN QUERY
  SELECT
    -- DVF — mutations DVF utilisables (Vente Maison/Apt avec surface) à la même
    -- adresse (CP + voie normalisée). Cap à 10 résultats les plus récents.
    COALESCE((
      SELECT jsonb_agg(row_to_json(d.*)::jsonb ORDER BY d.date_mutation DESC)
      FROM (
        SELECT
          a.id, a.id_mutation, a.date_mutation, a.nature_mutation,
          a.valeur_fonciere_cents, a.surface_reelle_bati, a.surface_terrain,
          a.nombre_pieces_principales, a.type_local,
          a.adresse_numero, a.adresse_voie, a.code_postal, a.commune,
          a.prix_m2_calc, a.is_groupee, a.usable_for_brh,
          a.parcelle_idu
        FROM public.brh_dvf_archive a
        WHERE a.code_postal = v_personne.code_postal
          AND v_voie_norm <> ''
          AND lower(a.adresse_voie) = v_voie_norm
        ORDER BY a.date_mutation DESC
        LIMIT 10
      ) d
    ), '[]'::jsonb) AS dvf_mutations,

    -- SCI décès — match nom + prénom (heuristique). Cap à 5.
    COALESCE((
      SELECT jsonb_agg(row_to_json(s.*)::jsonb)
      FROM (
        SELECT
          m.id, m.siren, m.nom, m.prenom, m.dirigeant_index,
          m.date_naissance, m.deces_date, m.deces_commune, m.deces_departement,
          m.match_confidence, m.source
        FROM public.brh_sci_deces_matches m
        WHERE m.match_found = TRUE
          AND lower(m.nom) = lower(COALESCE(v_personne.nom, ''))
          AND lower(m.prenom) = lower(COALESCE(v_personne.prenom, ''))
          AND v_personne.nom IS NOT NULL
          AND v_personne.prenom IS NOT NULL
        ORDER BY m.deces_date DESC NULLS LAST
        LIMIT 5
      ) s
    ), '[]'::jsonb) AS sci_deces_matches,

    -- BODACC — alertes liées via société ou personne. Cap à 10.
    COALESCE((
      SELECT jsonb_agg(row_to_json(b.*)::jsonb)
      FROM (
        SELECT
          b.id_bodacc, b.famille_avis, b.type_avis,
          b.date_publication, b.date_parution,
          b.siren, b.denomination, b.forme_juridique,
          b.commune, b.code_postal,
          b.prix_cession_cents, b.date_cession,
          b.bodacc_url
        FROM public.brh_bodacc_alerts b
        WHERE (
          v_personne.societe IS NOT NULL
          AND lower(COALESCE(b.denomination, '')) = lower(v_personne.societe)
        )
        ORDER BY b.date_publication DESC NULLS LAST
        LIMIT 10
      ) b
    ), '[]'::jsonb) AS bodacc_alerts
  ;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_personne_signals_externes(uuid) TO authenticated;

COMMENT ON FUNCTION public.brh_personne_signals_externes IS
  '2026-05-19 — Signaux externes (DVF mutations, SCI décès, BODACC) attachés à un contact BRH. Réservé BRH internes.';
