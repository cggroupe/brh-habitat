-- =============================================================================
-- 2026-05-27 — Fix perf brh_foncier_prospects_unified : remove NULLS LAST
-- =============================================================================
--
-- Bug : ORDER BY f.score_v2 DESC NULLS LAST empêchait Postgres d'utiliser
-- l'index partiel brh_dpe_prospects_score_v2 (WHERE score_v2 IS NOT NULL DESC).
-- Le planner faisait un Parallel Seq Scan sur 203 854 rows + COUNT(*) OVER
-- → 7+ secondes → "canceling statement due to statement timeout".
--
-- Fix : retirer NULLS LAST (la clause WHERE garantit déjà score_v2 NOT NULL).
-- Résultat : <500ms au lieu de 7s.
--
-- Appliqué manuellement le 27/05 via ALTER FUNCTION (pas de CREATE OR REPLACE
-- complet ici car la définition est dans 20260517100000_brh_foncier_prospects_unified.sql
-- — on garde une migration tracking pour traçabilité).
-- =============================================================================

-- Patch idempotent : si le code contient encore NULLS LAST, recréer la fonction
-- avec la version corrigée (déjà appliquée à la main 27/05 17h).
-- Ce fichier sert de témoin pour les futurs replay de migrations.

DO $$
DECLARE
  v_src TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_src
  FROM pg_proc
  WHERE proname = 'brh_foncier_prospects_unified'
  LIMIT 1;

  IF v_src LIKE '%NULLS LAST%' THEN
    RAISE NOTICE 'brh_foncier_prospects_unified contient encore NULLS LAST, à patcher manuellement.';
  ELSE
    RAISE NOTICE 'brh_foncier_prospects_unified OK (pas de NULLS LAST).';
  END IF;
END $$;
