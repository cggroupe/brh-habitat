-- 2026-05-19 — Étend le score d'enrichissement pour valoriser
-- l'historique commercial (travaux réalisés catalogués + visites employés).
--
-- Avant : score basé uniquement sur OSINT + signaux BRH internes statiques.
-- Après : +2 par poste de travaux catalogué (max +6), +1 par visite (max +3).
--
-- Cible : les nouveaux contacts PPO_44 qui ont des chantiers historiques
-- mais pas de RDV calendrier ni d'OSINT remontent en tier bronze/silver.

CREATE OR REPLACE FUNCTION public.brh_personne_enrichment_score(p public.brh_personnes_historique)
RETURNS smallint
LANGUAGE sql STABLE
AS $$
  SELECT (
    (p.telephone IS NOT NULL)::int
    + (p.email IS NOT NULL)::int
    + (p.osint_linkedin IS NOT NULL)::int * 3
    + (p.osint_facebook IS NOT NULL)::int * 2
    + (p.psy_profile IS NOT NULL)::int * 3
    + (p.osint_other ? 'apify_google')::int * 2
    + (((p.osint_other ? 'maigret') AND ((p.osint_other->'maigret'->>'n_hits')::int > 0))::int * 2)
    + (p.osint_sherlock IS NOT NULL)::int
    + (((p.osint_other ? 'holehe')
        AND jsonb_typeof(p.osint_other->'holehe'->'used_on') = 'array'
        AND jsonb_array_length(p.osint_other->'holehe'->'used_on') > 0)::int)
    + (p.ca_total_eur IS NOT NULL)::int
    + (COALESCE(p.nb_rdv, 0) > 0)::int
    + (p.linked_dpe_id IS NOT NULL)::int * 2
    -- NOUVEAU : historique commercial PPO
    + LEAST(
        (SELECT COUNT(*) FROM public.brh_personne_travaux t WHERE t.personne_id = p.id)::int * 2,
        6
      )::int
    + LEAST(
        (SELECT COUNT(*) FROM public.brh_personne_visits v WHERE v.personne_id = p.id)::int,
        3
      )::int
  )::smallint;
$$;

-- Recompute tous les tiers (le trigger BEFORE UPDATE va se déclencher)
UPDATE public.brh_personnes_historique
SET updated_at = now()
WHERE id IN (
  SELECT DISTINCT p.id FROM public.brh_personnes_historique p
  WHERE EXISTS (SELECT 1 FROM public.brh_personne_travaux t WHERE t.personne_id = p.id)
     OR EXISTS (SELECT 1 FROM public.brh_personne_visits v WHERE v.personne_id = p.id)
);

COMMENT ON FUNCTION public.brh_personne_enrichment_score IS
  '2026-05-19 v2 — Score enrichissement intègre désormais : travaux catalogués (max +6) + visites employés (max +3) en plus des signaux OSINT/BRH statiques.';
