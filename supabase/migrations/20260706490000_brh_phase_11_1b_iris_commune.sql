-- Phase 11.1 (suite) — Score v2 columns sur brh_dpe_prospects
--
-- NB : les tables brh_ext_iris et brh_ext_commune ont déjà été créées
-- lors de la phase 11.0 (2026-05-01) avec le schéma initial du plan
-- external-data-sources.md. Cette migration ne fait qu'ajouter les
-- colonnes de scoring v2 sur brh_dpe_prospects (idempotent).
--
-- Schémas existants :
--   brh_ext_iris : 1909 rows BZH (Filosofi 577, Enedis 1766, GRDF 906)
--   brh_ext_commune : 1202 rows BZH (Géorisques+ANAH+Sit@del2)
--   brh_ext_cache : ajouté Phase 11.1.a (20260706480000)
--   brh_ext_rge_companies : 14 810 qualifs Phase 11.1.a

-- Colonnes scoring v2 (idempotent — certains comptes ont déjà ajouté score_v2)
ALTER TABLE brh_dpe_prospects ADD COLUMN IF NOT EXISTS iris_code CHAR(9);
ALTER TABLE brh_dpe_prospects ADD COLUMN IF NOT EXISTS score_v2 SMALLINT;
ALTER TABLE brh_dpe_prospects ADD COLUMN IF NOT EXISTS score_v2_segment TEXT;
ALTER TABLE brh_dpe_prospects ADD COLUMN IF NOT EXISTS score_v2_breakdown JSONB;
ALTER TABLE brh_dpe_prospects ADD COLUMN IF NOT EXISTS score_v2_calculated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS brh_dpe_prospects_score_v2 ON brh_dpe_prospects (score_v2 DESC) WHERE score_v2 IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_dpe_prospects_iris ON brh_dpe_prospects (iris_code) WHERE iris_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_dpe_prospects_segment ON brh_dpe_prospects (score_v2_segment) WHERE score_v2_segment IS NOT NULL;

COMMENT ON COLUMN brh_dpe_prospects.score_v2 IS 'Score composite 0-100 calculé via brh_ext_iris + brh_ext_commune (cf. external-data-sources.md)';
COMMENT ON COLUMN brh_dpe_prospects.score_v2_segment IS 'Segment commercial : ultra_chaud | mpr_bleu_prio | premium | standard | cold';
COMMENT ON COLUMN brh_dpe_prospects.score_v2_breakdown IS 'Breakdown détaillé règles déclenchées (JSONB rules array)';
