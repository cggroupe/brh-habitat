-- =============================================================================
-- 2026-05-24 — Phase C2 dette technique : enrichissement BAN brh_personnes_historique
-- =============================================================================
--
-- Contexte (handoff-2026-05-22.md, dette priorité haute) :
--   brh_personnes_historique (18 571 clients BRH) n'a pas d'adresse_ban_id.
--   Conséquence : matching strict client ↔ DPE plafonne à 419 matches (~2.3%)
--   alors que l'enrichissement BAN à l'ingestion ferait passer à 95%+ (le BAN
--   id est la clé exacte de jointure entre DPE ADEME et toute source officielle
--   française d'adresse normalisée).
--
-- Cette migration ajoute :
--   - adresse_ban_id (clé BAN — UUID format "XXXXX_XXXX_XX_XX")
--   - adresse_ban_score (confiance BAN 0-1, NULL = pas trouvé)
--   - adresse_ban_lat / lon (centroid BAN)
--   - adresse_ban_label (label normalisé BAN)
--   - adresse_ban_enriched_at (timestamp enrichissement)
--
-- L'enrichissement effectif est fait par `scripts/brh-enrich-ban-personnes.py`
-- qui :
--   - Lit les personnes sans adresse_ban_id
--   - Call api-adresse.data.gouv.fr/search?q={adresse}&postcode={cp}
--   - UPSERT le top hit si score > 0.5
--   - Respecte rate limit 25 req/s
-- =============================================================================

ALTER TABLE public.brh_personnes_historique
  ADD COLUMN IF NOT EXISTS adresse_ban_id TEXT,
  ADD COLUMN IF NOT EXISTS adresse_ban_score NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS adresse_ban_lat NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS adresse_ban_lon NUMERIC(10,6),
  ADD COLUMN IF NOT EXISTS adresse_ban_label TEXT,
  ADD COLUMN IF NOT EXISTS adresse_ban_enriched_at TIMESTAMPTZ;

-- Index pour matching futur DPE↔personne via BAN id
CREATE INDEX IF NOT EXISTS brh_personnes_historique_adresse_ban_id_idx
  ON public.brh_personnes_historique (adresse_ban_id)
  WHERE adresse_ban_id IS NOT NULL;

-- Index partiel pour script d'enrichment (lookup rapide des "non encore enrichis")
CREATE INDEX IF NOT EXISTS brh_personnes_historique_to_enrich_idx
  ON public.brh_personnes_historique (id)
  WHERE adresse_ban_enriched_at IS NULL AND adresse IS NOT NULL;

COMMENT ON COLUMN public.brh_personnes_historique.adresse_ban_id IS
  'Identifiant BAN (Base Adresse Nationale) — clé exacte de jointure avec DPE ADEME, BAN reverse, IGN cadastre. Enrichi via api-adresse.data.gouv.fr. NULL = pas trouvé ou pas encore enrichi.';

COMMENT ON COLUMN public.brh_personnes_historique.adresse_ban_score IS
  'Score de confiance BAN 0.0-1.0. < 0.5 = match faible (NULL conservé). Référence : seuil BAN officiel pour confirmation = 0.7.';
