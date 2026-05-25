-- =============================================================================
-- 2026-05-25 — Phase 1 : ajout adresse_ban_id à brh_dpe_prospects
-- =============================================================================
--
-- Contexte (handoff-2026-05-25.md, suggestion #1) :
--   brh_personnes_historique a maintenant 91.9% de couverture adresse_ban_id
--   (16 740/18 218 personnes — chantier finalisé 25/05).
--   Mais brh_dpe_prospects n'a que adresse_ban TEXT (label normalisé), pas l'id
--   structuré. Sans id côté DPE, on ne peut PAS JOIN sur ban_id.
--
-- Cette migration ajoute :
--   - adresse_ban_id (clé BAN — format "XXXXX_XXXX_XX_XX")
--   - adresse_ban_score (confiance 0-1, NULL = non trouvé)
--   - adresse_ban_enriched_at (timestamp enrichissement, idempotence)
--
-- Note volontaire : on ne duplique PAS lat/lon/label.
--   latitude/longitude (DOUBLE PRECISION) sont déjà présents et alimentés par
--   l'enrichissement BAN initial à l'ingestion ADEME. adresse_ban TEXT contient
--   déjà le label normalisé. Évite la redondance.
--
-- L'enrichissement effectif est fait par `scripts/brh-enrich-ban-dpe-prospects.py`
-- qui :
--   - Lit les DPE sans adresse_ban_id (~206k rows)
--   - Call api-adresse.data.gouv.fr/search?q={numero voie ville}&postcode={cp}
--   - UPSERT le top hit si score > 0.5
--   - Respecte rate limit 25 req/s + batch UPDATE 100/0.5s anti-saturation
-- =============================================================================

ALTER TABLE public.brh_dpe_prospects
  ADD COLUMN IF NOT EXISTS adresse_ban_id TEXT,
  ADD COLUMN IF NOT EXISTS adresse_ban_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS adresse_ban_enriched_at TIMESTAMPTZ;

-- Index pour matching futur DPE↔personne via BAN id
CREATE INDEX IF NOT EXISTS brh_dpe_prospects_adresse_ban_id_idx
  ON public.brh_dpe_prospects (adresse_ban_id)
  WHERE adresse_ban_id IS NOT NULL;

-- Index partiel pour script d'enrichment (lookup rapide des "non encore enrichis")
CREATE INDEX IF NOT EXISTS brh_dpe_prospects_to_enrich_ban_idx
  ON public.brh_dpe_prospects (id)
  WHERE adresse_ban_enriched_at IS NULL
    AND code_postal IS NOT NULL
    AND voie_norm IS NOT NULL;

COMMENT ON COLUMN public.brh_dpe_prospects.adresse_ban_id IS
  'Identifiant BAN — clé exacte de jointure avec brh_personnes_historique.adresse_ban_id et toute source officielle française. Enrichi via api-adresse.data.gouv.fr. NULL = pas trouvé ou pas encore enrichi.';

COMMENT ON COLUMN public.brh_dpe_prospects.adresse_ban_score IS
  'Score de confiance BAN 0.0-1.0. < 0.5 = match faible (NULL conservé). Seuil BAN officiel = 0.7.';
