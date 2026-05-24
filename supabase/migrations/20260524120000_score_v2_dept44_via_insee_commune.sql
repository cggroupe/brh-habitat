-- =============================================================================
-- 2026-05-24 — Phase C1 dette technique : score V2 dept 44 via code_insee
-- =============================================================================
--
-- Problème (handoff-2026-05-22.md, backlog priorité haute) :
--   60 456 DPE du dept 44 (Loire-Atlantique) ont `score_v2 = 5` fixe car la
--   migration 20260706550000_brh_phase_11_6_score_v2_22_rules joint sur
--   `substr(iris_code, 1, 5)` pour récupérer la commune dans brh_ext_commune.
--   Or 0/60456 DPE 44 ont iris_code (IRIS non ingéré pour 44) → 0 match commune.
--
-- Phase C1 résout en 2 étapes :
--   1. brh_ext_commune dept 44 peuplé (207 communes via seed-commune-bretagne.ts)
--   2. Cette migration : recalcule score V2 pour les 38 092 DPE 44 ayant
--      `code_insee` via JOIN direct c.insee = p.code_insee (pas via IRIS).
--
-- 19/22 règles applicables (les 3 IRIS-dépendantes restent NULL : r_mpr,
-- r_precar, r_proprio_ancien, r_vacance — soit -65 points max manquants).
-- Score V2 max théorique pour DPE 44 : ~145 points → cap 100. Suffisant pour
-- filtres "Mes leads" et ranking. La résolution complète viendra en Phase C4
-- (IRIS véritable).
--
-- Idempotent : peut être ré-exécutée sans effet de bord (UPDATE conditionnel).
-- =============================================================================

WITH scored AS (
  SELECT
    p.id, p.etiquette_dpe, p.dvf_mutation_24m, p.has_pv_36kw, p.enedis_kwh_logt,
    c.rga_alea, c.radon_categorie, c.nb_rge_isolation,
    c.prix_m2_growth_3y, c.opah_active,
    c.nb_dp_logements_existants_12m, c.dju_18_normal,
    c.tlv_tendue, c.lovac_tx_vacance_long,
    c.audits_ademe_count, c.merimee_count,
    c.evolution_pop_16_22, c.catnat_total, c.catnat_inondation,
    c.basias_count, c.sru_carencee, c.abf_ac1_count,
    -- 19 règles (3 IRIS-dépendantes mises à 0)
    CASE WHEN p.dvf_mutation_24m AND p.etiquette_dpe IN ('F','G') THEN 35 ELSE 0 END AS r_mut_fg,
    CASE WHEN p.enedis_kwh_logt > 250 THEN 15 ELSE 0 END AS r_enedis,
    CASE WHEN c.rga_alea = 'fort' THEN 10 ELSE 0 END AS r_rga,
    CASE WHEN c.radon_categorie = 3 THEN 10 ELSE 0 END AS r_radon,
    CASE WHEN c.nb_rge_isolation IS NOT NULL AND c.nb_rge_isolation < 5 THEN 5 ELSE 0 END AS r_concur,
    CASE WHEN c.prix_m2_growth_3y > 0.15 THEN 7 ELSE 0 END AS r_gentrif,
    CASE WHEN p.has_pv_36kw THEN -10 ELSE 0 END AS r_pv,
    CASE WHEN c.opah_active THEN 8 ELSE 0 END AS r_opah,
    CASE WHEN c.nb_dp_logements_existants_12m > 50 THEN 5 ELSE 0 END AS r_sitadel,
    CASE WHEN p.etiquette_dpe IN ('F','G') THEN 10 ELSE 0 END AS r_fg,
    CASE WHEN c.dju_18_normal > 2700 THEN 5 ELSE 0 END AS r_dju_eleve,
    CASE WHEN c.tlv_tendue THEN 8 ELSE 0 END AS r_tlv_tendue,
    CASE WHEN c.lovac_tx_vacance_long > 0.05 THEN 5 ELSE 0 END AS r_lovac,
    CASE WHEN c.audits_ademe_count > 100 THEN 5 ELSE 0 END AS r_audits_dyna,
    CASE WHEN c.merimee_count >= 5 OR c.abf_ac1_count > 0 THEN -5 ELSE 0 END AS r_abf_lourd,
    CASE WHEN c.evolution_pop_16_22 > 0.05 THEN 5 ELSE 0 END AS r_pop_growth,
    CASE WHEN c.catnat_total >= 5 OR c.catnat_inondation >= 3 THEN -3 ELSE 0 END AS r_catnat_lourd,
    CASE WHEN c.basias_count > 50 THEN -3 ELSE 0 END AS r_basias_lourd,
    CASE WHEN c.sru_carencee THEN 5 ELSE 0 END AS r_sru_carencee
  FROM brh_dpe_prospects p
  LEFT JOIN brh_ext_commune c ON c.insee::text = p.code_insee::text
  WHERE p.departement = '44'
    AND p.code_insee IS NOT NULL
)
UPDATE brh_dpe_prospects p
SET
  score_v2 = LEAST(100, GREATEST(0,
    s.r_mut_fg + s.r_enedis + s.r_rga + s.r_radon
    + s.r_concur + s.r_gentrif + s.r_pv
    + s.r_opah + s.r_sitadel + s.r_fg
    + s.r_dju_eleve + s.r_tlv_tendue + s.r_lovac
    + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth
    + s.r_catnat_lourd + s.r_basias_lourd + s.r_sru_carencee
  )),
  score_v2_segment = (
    CASE
      WHEN LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth
        + s.r_catnat_lourd + s.r_basias_lourd + s.r_sru_carencee
      )) >= 60 THEN 'premium'
      WHEN LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth
        + s.r_catnat_lourd + s.r_basias_lourd + s.r_sru_carencee
      )) >= 40 THEN 'standard'
      ELSE 'cold'
    END
  ),
  score_v2_calculated_at = now()
FROM scored s
WHERE p.id = s.id;
