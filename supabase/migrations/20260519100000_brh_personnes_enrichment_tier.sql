-- 2026-05-19 — Enrichment score + tier sur brh_personnes_historique.
-- Synthèse OSINT/BRH pour permettre tri/filtre commercial.
--
-- Score formé par (poids entre parenthèses) :
--   tel(1) + email(1) + linkedin(3) + facebook(2) + psy_profile(3)
--   + apify_google(2) + maigret_with_hits(2) + sherlock_clean(1)
--   + holehe_used(1) + ca(1) + nb_rdv(1) + linked_dpe(2)
--
-- Tiers :
--   gold   >= 10 (fiche commerciale prête)
--   silver >= 6
--   bronze >= 3
--   none   < 3

ALTER TABLE public.brh_personnes_historique
  ADD COLUMN IF NOT EXISTS enrichment_score smallint,
  ADD COLUMN IF NOT EXISTS enrichment_tier text;

-- Fonction pure de calcul du score (réutilisable depuis trigger / backfill / RPC)
CREATE OR REPLACE FUNCTION public.brh_personne_enrichment_score(p public.brh_personnes_historique)
RETURNS smallint
LANGUAGE sql IMMUTABLE
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
  )::smallint;
$$;

CREATE OR REPLACE FUNCTION public.brh_personne_enrichment_tier(score smallint)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN score >= 10 THEN 'gold'
    WHEN score >= 6  THEN 'silver'
    WHEN score >= 3  THEN 'bronze'
    ELSE 'none'
  END;
$$;

-- Backfill complet
UPDATE public.brh_personnes_historique p
SET enrichment_score = s.sc,
    enrichment_tier  = public.brh_personne_enrichment_tier(s.sc),
    updated_at = now()
FROM (
  SELECT id, public.brh_personne_enrichment_score(brh_personnes_historique) AS sc
  FROM public.brh_personnes_historique
) s
WHERE p.id = s.id;

-- Index pour filtres/tri rapide
CREATE INDEX IF NOT EXISTS brh_personnes_enrichment_tier_idx
  ON public.brh_personnes_historique (enrichment_tier);
CREATE INDEX IF NOT EXISTS brh_personnes_enrichment_score_idx
  ON public.brh_personnes_historique (enrichment_score DESC NULLS LAST);

-- Trigger : recalcule à chaque update touchant les sources
CREATE OR REPLACE FUNCTION public.brh_personnes_refresh_enrichment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.enrichment_score := public.brh_personne_enrichment_score(NEW);
  NEW.enrichment_tier  := public.brh_personne_enrichment_tier(NEW.enrichment_score);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brh_personnes_refresh_enrichment_trg
  ON public.brh_personnes_historique;
CREATE TRIGGER brh_personnes_refresh_enrichment_trg
  BEFORE INSERT OR UPDATE OF
    telephone, email, osint_linkedin, osint_facebook, psy_profile,
    osint_other, osint_sherlock, ca_total_eur, nb_rdv, linked_dpe_id
  ON public.brh_personnes_historique
  FOR EACH ROW EXECUTE FUNCTION public.brh_personnes_refresh_enrichment();

COMMENT ON COLUMN public.brh_personnes_historique.enrichment_score IS
  '2026-05-19 — Score 0-15 synthèse OSINT + données BRH (auto via trigger)';
COMMENT ON COLUMN public.brh_personnes_historique.enrichment_tier IS
  '2026-05-19 — gold/silver/bronze/none (dérivé d''enrichment_score)';
