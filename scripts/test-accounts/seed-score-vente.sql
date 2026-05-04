-- =============================================================================
-- BRH Habitat — Seed brh_score_vente_v1 + lead_assignments démo agence test
-- =============================================================================
-- Sans cette seed, le compte agence@brh-test.fr est un "compte fantôme" :
-- /agence/score-vente est vide (algo jamais batché), /agence/leads vide
-- (aucun claim), /agence (KPI à 0).
--
-- Ce script :
--   1. Score 500 prospects DPE F/G Bretagne avec un algo SQL simplifié
--      (calque les 13 règles de src/lib/dpe-engine/score-vente/index.ts
--      sur ce qui est dispo en DB sans appels externes coûteux).
--   2. Pré-claim 5 leads pour l'agence test (Pichon Immobilier).
--   3. Met à jour le compteur current_month_claims dans agence_subscriptions.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- 1. Score : sample 500 prospects F/G Bretagne avec coords + surface
DELETE FROM brh_score_vente_v1
WHERE prospect_id IN (
  SELECT id FROM brh_dpe_prospects
  WHERE etiquette_dpe IN ('F','G')
    AND latitude IS NOT NULL AND longitude IS NOT NULL
    AND surface_habitable IS NOT NULL
  ORDER BY id
  LIMIT 500
);

INSERT INTO brh_score_vente_v1 (prospect_id, score, segment, rules_breakdown, proba_6m)
SELECT
  p.id,
  -- Score : règles simplifiées (alignées TS lib)
  LEAST(100, GREATEST(0,
    -- R1 base DPE
    CASE p.etiquette_dpe WHEN 'G' THEN 70 WHEN 'F' THEN 60 ELSE 0 END
    -- R2 DPE ≥ 5 ans
    + CASE WHEN p.date_dpe IS NOT NULL AND p.date_dpe < now() - interval '5 years' THEN 15 ELSE 0 END
    -- R8 surface
    + CASE
        WHEN p.surface_habitable >= 120 THEN 10
        WHEN p.surface_habitable >= 80 THEN 5
        ELSE 0 END
    -- R10 maison individuelle
    + CASE WHEN p.type_batiment ILIKE '%maison%' OR p.type_batiment ILIKE '%individuel%' THEN 8 ELSE 0 END
    -- R12 zone active Bretagne (toujours +5 vu qu'on est filtre Bretagne)
    + 5
    -- Pénalité chauffage collectif (si présent)
    - CASE WHEN p.energie_chauffage ILIKE '%collectif%' THEN 10 ELSE 0 END
    -- Bonus construction ancienne forte (avant 1975)
    + CASE WHEN p.annee_construction IS NOT NULL AND p.annee_construction < 1975 THEN 8 ELSE 0 END
  ))::INTEGER AS score,
  -- Segment selon score
  CASE
    WHEN LEAST(100, GREATEST(0,
      CASE p.etiquette_dpe WHEN 'G' THEN 70 WHEN 'F' THEN 60 ELSE 0 END
      + CASE WHEN p.date_dpe IS NOT NULL AND p.date_dpe < now() - interval '5 years' THEN 15 ELSE 0 END
      + CASE WHEN p.surface_habitable >= 120 THEN 10 WHEN p.surface_habitable >= 80 THEN 5 ELSE 0 END
      + CASE WHEN p.type_batiment ILIKE '%maison%' OR p.type_batiment ILIKE '%individuel%' THEN 8 ELSE 0 END
      + 5
      - CASE WHEN p.energie_chauffage ILIKE '%collectif%' THEN 10 ELSE 0 END
      + CASE WHEN p.annee_construction IS NOT NULL AND p.annee_construction < 1975 THEN 8 ELSE 0 END
    )) >= 80 THEN 'tres_chaud'
    WHEN LEAST(100, GREATEST(0,
      CASE p.etiquette_dpe WHEN 'G' THEN 70 WHEN 'F' THEN 60 ELSE 0 END
      + CASE WHEN p.date_dpe IS NOT NULL AND p.date_dpe < now() - interval '5 years' THEN 15 ELSE 0 END
      + CASE WHEN p.surface_habitable >= 120 THEN 10 WHEN p.surface_habitable >= 80 THEN 5 ELSE 0 END
      + CASE WHEN p.type_batiment ILIKE '%maison%' OR p.type_batiment ILIKE '%individuel%' THEN 8 ELSE 0 END
      + 5
      - CASE WHEN p.energie_chauffage ILIKE '%collectif%' THEN 10 ELSE 0 END
      + CASE WHEN p.annee_construction IS NOT NULL AND p.annee_construction < 1975 THEN 8 ELSE 0 END
    )) >= 60 THEN 'chaud'
    WHEN LEAST(100, GREATEST(0,
      CASE p.etiquette_dpe WHEN 'G' THEN 70 WHEN 'F' THEN 60 ELSE 0 END
      + CASE WHEN p.date_dpe IS NOT NULL AND p.date_dpe < now() - interval '5 years' THEN 15 ELSE 0 END
      + CASE WHEN p.surface_habitable >= 120 THEN 10 WHEN p.surface_habitable >= 80 THEN 5 ELSE 0 END
      + CASE WHEN p.type_batiment ILIKE '%maison%' OR p.type_batiment ILIKE '%individuel%' THEN 8 ELSE 0 END
      + 5
      - CASE WHEN p.energie_chauffage ILIKE '%collectif%' THEN 10 ELSE 0 END
      + CASE WHEN p.annee_construction IS NOT NULL AND p.annee_construction < 1975 THEN 8 ELSE 0 END
    )) >= 40 THEN 'tiede'
    ELSE 'froid'
  END AS segment,
  -- Breakdown JSON
  jsonb_build_object(
    'dpe_base', CASE p.etiquette_dpe WHEN 'G' THEN 70 WHEN 'F' THEN 60 ELSE 0 END,
    'dpe_age', CASE WHEN p.date_dpe < now() - interval '5 years' THEN 15 ELSE 0 END,
    'surface', CASE WHEN p.surface_habitable >= 120 THEN 10 WHEN p.surface_habitable >= 80 THEN 5 ELSE 0 END,
    'maison_indiv', CASE WHEN p.type_batiment ILIKE '%maison%' OR p.type_batiment ILIKE '%individuel%' THEN 8 ELSE 0 END,
    'bretagne_bonus', 5,
    'collectif_penalite', CASE WHEN p.energie_chauffage ILIKE '%collectif%' THEN -10 ELSE 0 END,
    'pre_75', CASE WHEN p.annee_construction < 1975 THEN 8 ELSE 0 END
  ) AS rules_breakdown,
  -- Proba 6m
  CASE
    WHEN p.etiquette_dpe = 'G' THEN 0.45
    WHEN p.etiquette_dpe = 'F' THEN 0.30
    ELSE 0.10
  END AS proba_6m
FROM brh_dpe_prospects p
WHERE p.etiquette_dpe IN ('F','G')
  AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL
  AND p.surface_habitable IS NOT NULL
ORDER BY p.id
LIMIT 500;

-- 2. Pré-claim 5 leads pour l'agence test
--    (pour que /agence/leads ne soit pas vide à l'arrivée)
DELETE FROM brh_lead_assignments
WHERE agence_id = '33333333-cccc-3333-cccc-333333333333';

INSERT INTO brh_lead_assignments (
  prospect_id, agence_id, status, contact_attempts, last_attempt_at,
  last_attempt_outcome, notes, claimed_at
)
SELECT
  s.prospect_id,
  '33333333-cccc-3333-cccc-333333333333'::uuid,
  CASE row_number() OVER (ORDER BY s.score DESC)
    WHEN 1 THEN 'contacted'
    WHEN 2 THEN 'contacted'
    WHEN 3 THEN 'active'
    WHEN 4 THEN 'active'
    ELSE 'active'
  END AS status,
  CASE row_number() OVER (ORDER BY s.score DESC)
    WHEN 1 THEN 1
    WHEN 2 THEN 2
    ELSE 0
  END AS contact_attempts,
  CASE row_number() OVER (ORDER BY s.score DESC)
    WHEN 1 THEN now() - interval '2 days'
    WHEN 2 THEN now() - interval '5 days'
    ELSE NULL
  END AS last_attempt_at,
  CASE row_number() OVER (ORDER BY s.score DESC)
    WHEN 1 THEN 'interested'
    WHEN 2 THEN 'no_answer'
    ELSE NULL
  END AS last_attempt_outcome,
  CASE row_number() OVER (ORDER BY s.score DESC)
    WHEN 1 THEN 'Vendeur intéressé, RDV prévu mardi 14h'
    WHEN 2 THEN 'Pas de réponse - rappel programmé'
    ELSE NULL
  END AS notes,
  now() - interval '7 days' + (row_number() OVER (ORDER BY s.score DESC)) * interval '1 day'
FROM brh_score_vente_v1 s
WHERE s.segment = 'tres_chaud'
ORDER BY s.score DESC
LIMIT 5;

-- 3. Mettre à jour le compteur de claims du mois en cours
UPDATE brh_agence_subscriptions
  SET current_month_claims = (
    SELECT count(*) FROM brh_lead_assignments
    WHERE agence_id = '33333333-cccc-3333-cccc-333333333333'
      AND status IN ('active', 'contacted')
      AND claimed_at >= date_trunc('month', now())
  )
  WHERE agence_id = '33333333-cccc-3333-cccc-333333333333';

COMMIT;

-- Récap
SELECT
  'Scores calculés' AS metric, count(*)::text AS value
  FROM brh_score_vente_v1
UNION ALL
SELECT 'tres_chaud', count(*)::text FROM brh_score_vente_v1 WHERE segment='tres_chaud'
UNION ALL
SELECT 'chaud', count(*)::text FROM brh_score_vente_v1 WHERE segment='chaud'
UNION ALL
SELECT 'tiede', count(*)::text FROM brh_score_vente_v1 WHERE segment='tiede'
UNION ALL
SELECT 'froid', count(*)::text FROM brh_score_vente_v1 WHERE segment='froid'
UNION ALL
SELECT 'Leads agence test', count(*)::text FROM brh_lead_assignments
  WHERE agence_id = '33333333-cccc-3333-cccc-333333333333';
