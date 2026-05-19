-- 2026-05-19 — Table pivot brh_entity_links (graphe d'entités BRH).
--
-- Objectif : matérialiser les liens entre les entités (au lieu de calculer à la
-- volée par heuristiques fragiles). Permet une fiche 360° par entité et une
-- exploration navigable.
--
-- Modèle :
--   from_type/from_id (entité source) → to_type/to_id (entité cible) avec link_type
--   + confidence (0-1) + evidence (jsonb des sources qui ont permis le match)
--
-- Types d'entités : 'personne_brh' | 'sci' | 'adresse_dpe' | 'permis_sitadel' | 'mutation_dvf'
-- Types de liens  : 'habite' | 'dirige' | 'detient' | 'a_demande_permis' | 'a_mute'

CREATE TABLE IF NOT EXISTS public.brh_entity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_type text NOT NULL,
  from_id   text NOT NULL,
  to_type   text NOT NULL,
  to_id     text NOT NULL,
  link_type text NOT NULL,
  confidence numeric(3,2) NOT NULL DEFAULT 1.0,
  evidence  jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by text NOT NULL DEFAULT 'auto',
  CONSTRAINT brh_entity_links_uk
    UNIQUE (from_type, from_id, to_type, to_id, link_type)
);

CREATE INDEX IF NOT EXISTS brh_entity_links_from_idx
  ON public.brh_entity_links (from_type, from_id);
CREATE INDEX IF NOT EXISTS brh_entity_links_to_idx
  ON public.brh_entity_links (to_type, to_id);
CREATE INDEX IF NOT EXISTS brh_entity_links_type_idx
  ON public.brh_entity_links (link_type);

-- RLS : lecture BRH interne uniquement
ALTER TABLE public.brh_entity_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brh_entity_links_select ON public.brh_entity_links;
CREATE POLICY brh_entity_links_select ON public.brh_entity_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role = ANY (ARRAY['admin'::text, 'pro'::text, 'employe'::text])
    )
  );

COMMENT ON TABLE public.brh_entity_links IS
  '2026-05-19 — Graphe d''entités BRH (pivot matérialisé). Backfill auto via brh_entity_links_recompute().';

-- ============================================================
-- Procédures de backfill (réutilisables à chaque nouvelle ingest)
-- ============================================================

CREATE OR REPLACE FUNCTION public.brh_entity_links_recompute()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  n_dirige int;
  n_habite int;
  n_mute   int;
  n_total  int;
BEGIN
  -- Règle 1 : personne BRH ↔ SCI dirigée (match nom+prenom)
  -- Confiance 0.85 (match nominatif sans date_naissance), 0.95 si dirigeant
  -- a un siège dans le même département que la personne BRH.
  WITH matches AS (
    SELECT
      'personne_brh'::text AS from_type,
      p.id::text AS from_id,
      'sci'::text AS to_type,
      s.siren::text AS to_id,
      'dirige'::text AS link_type,
      CASE
        WHEN s.departement = left(p.code_postal::text, 2) THEN 0.95
        ELSE 0.85
      END AS confidence,
      jsonb_build_object(
        'rule', 'nom+prenom case-insensitive',
        'sci_dirigeant_index', d.idx,
        'sci_departement', s.departement,
        'personne_dept', left(p.code_postal::text, 2)
      ) AS evidence
    FROM public.brh_personnes_historique p
    JOIN public.brh_sci_companies s ON TRUE
    JOIN LATERAL jsonb_array_elements(COALESCE(s.dirigeants, '[]'::jsonb))
         WITH ORDINALITY d(elem, idx) ON TRUE
    WHERE p.nom IS NOT NULL
      AND p.prenom IS NOT NULL
      AND length(p.nom) >= 2
      AND length(p.prenom) >= 2
      AND lower(d.elem->>'nom') = lower(p.nom)
      AND lower(d.elem->>'prenom') = lower(p.prenom)
  )
  INSERT INTO public.brh_entity_links
    (from_type, from_id, to_type, to_id, link_type, confidence, evidence)
  SELECT from_type, from_id, to_type, to_id, link_type, confidence, evidence
  FROM matches
  ON CONFLICT (from_type, from_id, to_type, to_id, link_type) DO UPDATE
    SET confidence = EXCLUDED.confidence,
        evidence = EXCLUDED.evidence,
        computed_at = now();
  GET DIAGNOSTICS n_dirige = ROW_COUNT;

  -- Règle 2 : personne BRH ↔ adresse DPE habitée
  -- Source 1 : linked_dpe_id déjà rempli (confiance 0.9)
  -- Source 2 : match par code_postal + voie normalisée (confiance 0.65)
  WITH matches AS (
    -- 2a) lien explicite via linked_dpe_id
    SELECT
      'personne_brh'::text AS from_type,
      p.id::text AS from_id,
      'adresse_dpe'::text AS to_type,
      p.linked_dpe_id::text AS to_id,
      'habite'::text AS link_type,
      0.9::numeric(3,2) AS confidence,
      jsonb_build_object('rule', 'linked_dpe_id', 'link_confidence', p.link_confidence) AS evidence
    FROM public.brh_personnes_historique p
    WHERE p.linked_dpe_id IS NOT NULL
    UNION ALL
    -- 2b) match heuristique adresse_voie + code_postal
    SELECT
      'personne_brh', p.id::text, 'adresse_dpe', d.id::text, 'habite',
      0.65,
      jsonb_build_object('rule', 'cp+voie_normalisee')
    FROM public.brh_personnes_historique p
    JOIN public.brh_dpe_prospects d
      ON d.code_postal = p.code_postal
     AND d.adresse IS NOT NULL
     AND p.adresse IS NOT NULL
     AND lower(regexp_replace(d.adresse,'^[0-9]+\s*','')) = lower(regexp_replace(p.adresse,'^[0-9]+\s*',''))
    WHERE p.linked_dpe_id IS NULL  -- évite doublon avec règle 2a
      AND length(p.adresse) > 5
  )
  INSERT INTO public.brh_entity_links
    (from_type, from_id, to_type, to_id, link_type, confidence, evidence)
  SELECT from_type, from_id, to_type, to_id, link_type, confidence, evidence
  FROM matches
  ON CONFLICT (from_type, from_id, to_type, to_id, link_type) DO UPDATE
    SET confidence = EXCLUDED.confidence,
        evidence = EXCLUDED.evidence,
        computed_at = now();
  GET DIAGNOSTICS n_habite = ROW_COUNT;

  -- Règle 3 : adresse DPE ↔ mutation DVF (match CP + voie normalisée).
  -- brh_dpe_prospects n'a pas parcelle_idu donc on s'appuie sur l'adresse texte.
  -- On limite aux mutations usable_for_brh pour éviter le bruit.
  WITH matches AS (
    SELECT
      'adresse_dpe'::text AS from_type,
      d.id::text AS from_id,
      'mutation_dvf'::text AS to_type,
      v.id::text AS to_id,
      'a_mute'::text AS link_type,
      0.7::numeric(3,2) AS confidence,
      jsonb_build_object('rule', 'cp+voie_normalisee') AS evidence
    FROM public.brh_dpe_prospects d
    JOIN public.brh_dvf_archive v
      ON v.code_postal = d.code_postal
     AND v.adresse_voie IS NOT NULL
     AND d.adresse IS NOT NULL
     AND lower(v.adresse_voie) = lower(regexp_replace(d.adresse,'^[0-9]+\s*',''))
    WHERE v.usable_for_brh = TRUE
  )
  INSERT INTO public.brh_entity_links
    (from_type, from_id, to_type, to_id, link_type, confidence, evidence)
  SELECT from_type, from_id, to_type, to_id, link_type, confidence, evidence
  FROM matches
  ON CONFLICT (from_type, from_id, to_type, to_id, link_type) DO UPDATE
    SET confidence = EXCLUDED.confidence,
        evidence = EXCLUDED.evidence,
        computed_at = now();
  GET DIAGNOSTICS n_mute = ROW_COUNT;

  -- (règle 4 : Sitadel ↔ adresse — sera ajoutée après import dataset)

  SELECT COUNT(*) INTO n_total FROM public.brh_entity_links;

  RETURN jsonb_build_object(
    'dirige_added', n_dirige,
    'habite_added', n_habite,
    'a_mute_added', n_mute,
    'total_links', n_total,
    'computed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_entity_links_recompute() TO authenticated;

COMMENT ON FUNCTION public.brh_entity_links_recompute IS
  '2026-05-19 — Recompute du graphe d''entités BRH. Idempotent (ON CONFLICT). À relancer après chaque ingest.';
