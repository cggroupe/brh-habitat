-- 2026-05-21 — Phase 8.3 — Score V2 étendu aux DPE classe E
--
-- DÉCISION PHILIPPE (21/05) : « tu peux étendre l'heuristique aux DPE
-- qui sont classés en E ».
--
-- CONTEXTE :
--   Suite à l'ingestion Phase 7 de 86 490 DPE classe E (+ Phase 8.2
--   pour le 44), tous ont actuellement score_v2 = NULL car la migration
--   20260706550000_brh_phase_11_6_score_v2_22_rules.sql ne traite que
--   les DPE F/G (règle r_fg : `WHEN etiquette_dpe IN ('F','G') THEN 10`).
--
--   De plus, les DPE E nouvellement ingérés n'ont pas encore d'iris_code
--   rempli (0%), donc les règles dépendant de `brh_ext_iris` et
--   `brh_ext_commune` ne s'appliquent pas. Score V2 complet nécessite
--   un enrichissement IRIS futur (P3).
--
-- STRATÉGIE :
--   On calcule un score_v2 MINIMAL pour les DPE E à partir des seules
--   colonnes p.* (sans dépendre d'IRIS/commune) :
--     - r_fg étendu : E=5, F=10, G=10 (anticipation interdiction 2034
--       vs interdiction effective 2025-2028 → poids divisé par 2)
--     - r_mut_fg étendu : E avec mutation 24m = +20 pts (vs F/G=35)
--     - r_enedis (overuse > 250 kWh/logement) : applicable à E
--     - r_pv (PV existant) : applicable à E (malus -10)
--
--   Maximum théorique sur E sans IRIS : 5 + 20 + 15 = 40 pts.
--   Les E avec IRIS plus tard auront un score complet 0-100.
--
--   Pour les F/G existants : on RE-CALCULE aussi avec la nouvelle règle
--   r_fg granulaire (E=5/F=10/G=10) — change rien pour F/G mais
--   harmonise les futures recalc.

-- Recalcul ciblé sur les DPE E + F + G de toutes les Bretagne (4 dépts) + 44
WITH scored AS (
  SELECT
    p.id, p.etiquette_dpe, p.dvf_mutation_24m, p.has_pv_36kw, p.enedis_kwh_logt,
    -- r_mut récente étendu (E + F/G) — pondération réduite pour E
    CASE
      WHEN p.dvf_mutation_24m AND p.etiquette_dpe IN ('F','G') THEN 35
      WHEN p.dvf_mutation_24m AND p.etiquette_dpe = 'E'        THEN 20
      ELSE 0
    END AS r_mut,
    -- r_classe granulaire
    CASE
      WHEN p.etiquette_dpe IN ('F','G') THEN 10
      WHEN p.etiquette_dpe = 'E'        THEN 5
      ELSE 0
    END AS r_classe,
    -- r_enedis : applicable toutes classes
    CASE WHEN p.enedis_kwh_logt > 250 THEN 15 ELSE 0 END AS r_enedis,
    -- r_pv : applicable toutes classes (malus)
    CASE WHEN p.has_pv_36kw THEN -10 ELSE 0 END AS r_pv
  FROM public.brh_dpe_prospects p
  WHERE p.etiquette_dpe IN ('E','F','G')
    AND p.departement IN ('22','29','35','44','56')
)
UPDATE public.brh_dpe_prospects p
SET
  score_v2 = LEAST(100, GREATEST(0,
    COALESCE(p.score_v2, 0) - COALESCE((
      -- déduit l'ancienne contribution r_fg=10 sur F/G pour éviter double comptage
      CASE WHEN p.etiquette_dpe IN ('F','G') THEN 10 ELSE 0 END
    ), 0) + s.r_mut + s.r_classe + s.r_enedis + s.r_pv
  ))::smallint,
  -- On ajoute un breakdown minimal pour les DPE E qui n'avaient rien
  score_v2_breakdown = CASE
    WHEN p.etiquette_dpe = 'E' AND (p.score_v2_breakdown IS NULL OR p.score_v2_breakdown = '{}'::jsonb) THEN
      jsonb_build_object(
        'rules',
        ARRAY_REMOVE(ARRAY[
          CASE WHEN s.r_mut > 0 THEN jsonb_build_object('rule','mutation_24m_E','points',s.r_mut) END,
          CASE WHEN s.r_classe > 0 THEN jsonb_build_object('rule','dpe_e_anticipation_2034','points',s.r_classe) END,
          CASE WHEN s.r_enedis > 0 THEN jsonb_build_object('rule','enedis_overuse','points',s.r_enedis) END,
          CASE WHEN s.r_pv < 0 THEN jsonb_build_object('rule','pv_existing','points',s.r_pv) END
        ], NULL),
        'note','minimal_without_iris_enrichment'
      )
    ELSE p.score_v2_breakdown  -- garde le breakdown existant pour F/G
  END
FROM scored s
WHERE p.id = s.id;

-- Smoke test : combien de DPE E ont maintenant un score V2 ?
DO $$
DECLARE
  v_e_scored bigint;
  v_e_total bigint;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE score_v2 IS NOT NULL),
    COUNT(*)
  INTO v_e_scored, v_e_total
  FROM public.brh_dpe_prospects
  WHERE etiquette_dpe = 'E' AND departement IN ('22','29','35','44','56');
  RAISE NOTICE 'DPE E scorés : % / % (%.1f%%)', v_e_scored, v_e_total,
    (v_e_scored::numeric * 100 / NULLIF(v_e_total, 0));
END $$;
