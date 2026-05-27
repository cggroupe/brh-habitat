-- =============================================================================
-- 2026-05-27 — Index composite (owner_siren NOT NULL, score_v2 DESC) pour filtre "Détenu par SCI"
-- =============================================================================
--
-- Bug : avec p_filter_avec_sci=true (WHERE p.owner_siren IS NOT NULL),
-- Postgres ne pouvait plus utiliser l'index brh_dpe_prospects_score_v2.
-- Il devait choisir entre :
--   - idx_brh_dpe_prospects_owner_siren (matche WHERE mais pas ORDER BY)
--   - brh_dpe_prospects_score_v2 (matche ORDER BY mais full scan owner_siren)
-- → seq scan + sort = 6s, timeout 3s.
--
-- Fix : index partiel sur score_v2 DESC limité aux rows avec owner_siren
-- non null. Postgres peut alors trier directement depuis l'index sans
-- recalculer le filtre. 6s → 54ms.
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS brh_dpe_prospects_sci_score
ON public.brh_dpe_prospects (score_v2 DESC)
WHERE owner_siren IS NOT NULL
  AND iris_code IS NOT NULL
  AND score_v2 IS NOT NULL;

COMMENT ON INDEX brh_dpe_prospects_sci_score IS
  'Index partiel pour le filtre "Détenu par SCI" du RPC brh_foncier_prospects_unified. Évite Parallel Seq Scan timeout 3s.';
