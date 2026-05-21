-- 2026-05-21 — Phase 2C — Colonnes pivot dirigeant → autres entreprises
--
-- CONTEXTE (cf docs/wiki/hub-sci-dirigeant.md §2) :
--   Demande Philippe : "Si un dirigeant de SCI a plusieurs sociétés, dont
--   une boulangerie, peut-être qu'on peut le contacter avec un mail ou un
--   numéro de téléphone sur ce commerce."
--
--   Décision D-2 du 21/05 : scale GRATUIT via API publique
--   recherche-entreprises.api.gouv.fr (pas Pappers 49€/mois).
--
-- COLONNES AJOUTÉES sur brh_dirigeants :
--   - autres_entreprises JSONB : array d'objets
--       [{ siren, denomination, nature_juridique, activite_principale,
--          siege_adresse, telephone, email, est_sci }]
--   - tel_pro_via_entreprise TEXT : tel public extrait d'une entreprise non-SCI
--   - email_pro_via_entreprise TEXT
--   - autres_entreprises_enriched_at TIMESTAMPTZ : marqueur dernière relance
--   - autres_entreprises_match_count INT : nb d'entreprises non-SCI trouvées
--
-- ENRICHISSEMENT :
--   Script /opt/stack/scripts/brh-enrich-dirigeants-autres-entreprises.py
--   qui appelle l'API et UPDATE en batch. Cron quotidien recommandé.

-- ─────────────────────────────────────────────────────────────────────────────
-- Colonnes
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brh_dirigeants
  ADD COLUMN IF NOT EXISTS autres_entreprises jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tel_pro_via_entreprise text,
  ADD COLUMN IF NOT EXISTS email_pro_via_entreprise text,
  ADD COLUMN IF NOT EXISTS autres_entreprises_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS autres_entreprises_match_count integer DEFAULT 0;

COMMENT ON COLUMN public.brh_dirigeants.autres_entreprises IS
  'Array JSONB des autres entreprises où ce dirigeant est mandataire (hors SCI). Enrichi via recherche-entreprises.api.gouv.fr (gratuit). Schema: [{siren, denomination, nature_juridique, activite_principale, siege_adresse, telephone?, email?, est_sci}].';

COMMENT ON COLUMN public.brh_dirigeants.tel_pro_via_entreprise IS
  'Téléphone professionnel public dérivé de la première entreprise non-SCI où le dirigeant est mandataire. Utile pour contacter le dirigeant SCI sur sa boulangerie/commerce/cabinet.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Index pour filtrer les dirigeants déjà enrichis vs à enrichir
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_brh_dirigeants_to_enrich
  ON public.brh_dirigeants (id)
  WHERE autres_entreprises_enriched_at IS NULL AND nb_dpe_total > 0;

CREATE INDEX IF NOT EXISTS idx_brh_dirigeants_with_tel_pro
  ON public.brh_dirigeants (id)
  WHERE tel_pro_via_entreprise IS NOT NULL;
