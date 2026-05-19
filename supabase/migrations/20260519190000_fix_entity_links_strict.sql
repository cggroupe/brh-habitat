-- 2026-05-19 — Fix règle de matching adresses strictes.
--
-- BUG identifié dans la version précédente du recompute :
--   1. `lower(regexp_replace(adresse,'^[0-9]+\s*',''))` retirait le numéro
--      → tous les voisins d'une même rue étaient liés au même DPE.
--   2. `lower(regexp_replace(adresse,'[^a-z0-9]','','g'))` appliquait le
--      regex AVANT le lower → les majuscules étaient retirées, ne restait
--      que les chiffres → "25 RUE DE GASCOGNE" matchait "25 BD LAENNEC".
--
-- Fix : `regexp_replace(lower(adresse),'[^a-z0-9]','','g')` — lower
-- puis regex sur a-z0-9. Compare nom complet adresse (numéro + voie).
--
-- Suppression aussi de la règle SCI 'dirige' (purgée le 19/05 — homonymes
-- nom+prenom sans match date_naissance).

CREATE OR REPLACE FUNCTION public.brh_entity_links_recompute()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  n_habite int;
  n_mute   int;
  n_total  int;
BEGIN
  -- Règle 2 : personne_brh ↔ adresse_dpe (habite) — STRICT
  -- 2a) linked_dpe_id explicite (conf 0.95)
  -- 2b) adresse exacte numéro + voie + CP (conf 0.90) — lower AVANT regex
  WITH matches AS (
    SELECT
      'personne_brh'::text AS from_type,
      p.id::text AS from_id,
      'adresse_dpe'::text AS to_type,
      p.linked_dpe_id::text AS to_id,
      'habite'::text AS link_type,
      0.95::numeric(3,2) AS confidence,
      jsonb_build_object('rule', 'linked_dpe_id') AS evidence
    FROM public.brh_personnes_historique p
    WHERE p.linked_dpe_id IS NOT NULL
    UNION ALL
    SELECT
      'personne_brh', p.id::text, 'adresse_dpe', d.id::text, 'habite',
      0.90, jsonb_build_object('rule', 'numero+voie+cp_exact')
    FROM public.brh_personnes_historique p
    JOIN public.brh_dpe_prospects d
      ON d.code_postal = p.code_postal
     AND p.adresse IS NOT NULL AND d.adresse IS NOT NULL
     AND length(p.adresse) > 5 AND length(d.adresse) > 5
     AND regexp_replace(lower(p.adresse),'[^a-z0-9]','','g')
       = regexp_replace(lower(d.adresse),'[^a-z0-9]','','g')
    WHERE p.linked_dpe_id IS NULL
  )
  INSERT INTO public.brh_entity_links
    (from_type, from_id, to_type, to_id, link_type, confidence, evidence)
  SELECT * FROM matches
  ON CONFLICT (from_type, from_id, to_type, to_id, link_type) DO UPDATE
    SET confidence = EXCLUDED.confidence,
        evidence = EXCLUDED.evidence,
        computed_at = now();
  GET DIAGNOSTICS n_habite = ROW_COUNT;

  -- Règle 3 : adresse_dpe ↔ mutation_dvf (a_mute) — STRICT
  -- DPE.adresse normalisée == (DVF.numero + ' ' + DVF.voie) normalisé
  WITH matches AS (
    SELECT
      'adresse_dpe'::text AS from_type,
      d.id::text AS from_id,
      'mutation_dvf'::text AS to_type,
      v.id::text AS to_id,
      'a_mute'::text AS link_type,
      0.85::numeric(3,2) AS confidence,
      jsonb_build_object('rule', 'numero+voie_exact') AS evidence
    FROM public.brh_dpe_prospects d
    JOIN public.brh_dvf_archive v
      ON v.code_postal = d.code_postal
     AND v.adresse_voie IS NOT NULL AND v.adresse_numero IS NOT NULL
     AND d.adresse IS NOT NULL
     AND regexp_replace(lower(d.adresse),'[^a-z0-9]','','g')
       = regexp_replace(lower(v.adresse_numero || ' ' || v.adresse_voie),'[^a-z0-9]','','g')
    WHERE v.usable_for_brh = TRUE
  )
  INSERT INTO public.brh_entity_links
    (from_type, from_id, to_type, to_id, link_type, confidence, evidence)
  SELECT * FROM matches
  ON CONFLICT (from_type, from_id, to_type, to_id, link_type) DO UPDATE
    SET confidence = EXCLUDED.confidence,
        evidence = EXCLUDED.evidence,
        computed_at = now();
  GET DIAGNOSTICS n_mute = ROW_COUNT;

  -- Règle 1 (SCI dirige) RETIRÉE le 19/05 : 0% des matches étaient corrects
  -- (homonymes nom+prenom sans validation date_naissance).
  -- À réintroduire au Sprint F avec match nom+prenom+date_naissance.

  SELECT COUNT(*) INTO n_total FROM public.brh_entity_links;

  RETURN jsonb_build_object(
    'habite_added', n_habite,
    'a_mute_added', n_mute,
    'total_links', n_total,
    'computed_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.brh_entity_links_recompute IS
  '2026-05-19 (v2) — Recompute strict du graphe BRH. Adresses normalisées avec lower AVANT regex (fix bug majuscules). SCI dirige retiré (homonymes).';
