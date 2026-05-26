-- =============================================================================
-- 2026-05-26 — Index B-Tree owner_siren manquant
-- =============================================================================
--
-- Audit Opus post-fix utilities : 4 SCI (ENEDIS, SCI INTERFEDERALE, FINISTERE
-- HABITAT, SA D'HLM D'ARMORIQUE) renvoyaient HTTP 500 sur leur fiche.
--
-- EXPLAIN ANALYZE : `SELECT count(*) FROM brh_dpe_prospects WHERE owner_siren
-- = '444608442'` faisait un Seq Scan → 10,7s (timeout PostgREST 8s).
--
-- Aucun index sur owner_siren alors que la colonne est utilisée par toutes
-- les jointures fiche dirigeant/entreprise. Création index partiel (NULL
-- exclus pour réduire la taille — ~70 % des DPE n'ont pas d'owner_siren).
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_brh_dpe_prospects_owner_siren
  ON public.brh_dpe_prospects (owner_siren)
  WHERE owner_siren IS NOT NULL;

COMMENT ON INDEX public.idx_brh_dpe_prospects_owner_siren IS
  'Index owner_siren B-Tree partiel (NULL exclus) — required pour fiche entreprise/dirigeant ; sinon Seq Scan 10s → PostgREST timeout (incident 26/05 PM).';
