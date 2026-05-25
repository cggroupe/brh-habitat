-- =============================================================================
-- 2026-05-24 — Phase C4 bis : recalcul score V2 22 règles après enrichissement
-- =============================================================================
--
-- Contexte :
--   - Phase C4 (matin) a enrichi 90 292 DPE avec iris_code via shapefile IGN
--     point-in-polygon (90% des DPE 22/29/35/44/56 sans IRIS désormais OK).
--   - Phase C1 complet a enrichi `brh_ext_commune` dept 44 avec 10 colonnes
--     critiques (prix_m2, catnat, lovac, tlv, sru, basias, mérimée, audits...).
--
-- Cette migration recalcule le score V2 (22 règles) pour TOUS les DPE 22/29/35/44/56
-- avec joins JOIN IRIS + JOIN commune (via code_insee_dpe = substr(iris_code,1,5)).
-- Idempotente : peut être ré-exécutée à chaque nouvel enrichissement.
--
-- Impact attendu :
--   - Bretagne (22/29/35/56) : F/G/E qui n'avaient pas iris_code → règles
--     IRIS-dépendantes activées (r_mpr, r_precar, r_proprio_ancien, r_vacance).
--   - Dept 44 : passe de score quasi-fixe 5/10 à variable avec 22 règles complètes.
--
-- Idem migration 20260706550000_brh_phase_11_6_score_v2_22_rules.sql mais avec
-- jeu de données enrichi.
-- =============================================================================

WITH scored AS (
  SELECT
    p.id, p.iris_code, p.etiquette_dpe, p.dvf_mutation_24m, p.has_pv_36kw, p.enedis_kwh_logt,
    i.couleur_mpr, i.decile_estime, i.thermosens_kwh_dj,
    i.tx_proprio, i.tx_avant_1975, i.tx_vacance_log,
    c.rga_alea, c.radon_categorie, c.nb_rge_isolation,
    c.prix_m2_growth_3y, c.opah_active, c.opah_type,
    c.nb_dp_logements_existants_12m, c.dju_18_normal, c.delta_dju_2050,
    c.tlv_tendue, c.tlv_zonage, c.lovac_tx_vacance_long,
    c.audits_ademe_count, c.merimee_count,
    c.evolution_pop_16_22, c.catnat_total, c.catnat_inondation,
    c.basias_count, c.sru_carencee, c.abf_ac1_count,
    -- 22 règles
    CASE WHEN p.dvf_mutation_24m AND p.etiquette_dpe IN ('F','G') THEN 35 ELSE 0 END AS r_mut_fg,
    CASE WHEN i.couleur_mpr = 'bleu' THEN 20 WHEN i.couleur_mpr = 'jaune' THEN 15 ELSE 0 END AS r_mpr,
    CASE WHEN p.enedis_kwh_logt > 250 THEN 15 ELSE 0 END AS r_enedis,
    CASE WHEN c.rga_alea = 'fort' THEN 10 ELSE 0 END AS r_rga,
    CASE WHEN c.radon_categorie = 3 THEN 10 ELSE 0 END AS r_radon,
    CASE WHEN c.nb_rge_isolation IS NOT NULL AND c.nb_rge_isolation < 5 THEN 5 ELSE 0 END AS r_concur,
    CASE WHEN c.prix_m2_growth_3y > 0.15 THEN 7 ELSE 0 END AS r_gentrif,
    CASE WHEN p.has_pv_36kw THEN -10 ELSE 0 END AS r_pv,
    CASE WHEN i.decile_estime = 1 AND i.thermosens_kwh_dj > 8000 THEN 15 ELSE 0 END AS r_precar,
    CASE WHEN c.opah_active THEN 8 ELSE 0 END AS r_opah,
    CASE WHEN c.nb_dp_logements_existants_12m > 50 THEN 5 ELSE 0 END AS r_sitadel,
    CASE WHEN p.etiquette_dpe IN ('F','G') THEN 10 ELSE 0 END AS r_fg,
    CASE WHEN i.tx_proprio > 0.7 AND i.tx_avant_1975 > 0.6 THEN 10 ELSE 0 END AS r_proprio_ancien,
    CASE WHEN i.tx_vacance_log > 0.10 THEN 5 ELSE 0 END AS r_vacance,
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
  LEFT JOIN brh_ext_iris i ON i.iris_code = p.iris_code
  LEFT JOIN brh_ext_commune c ON c.insee::text = substr(p.iris_code, 1, 5)
  WHERE p.departement IN ('22','29','35','44','56')
)
UPDATE brh_dpe_prospects p
SET
  score_v2 = LEAST(100, GREATEST(0,
    s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon
    + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
    + s.r_opah + s.r_sitadel + s.r_fg
    + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
    + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
    + s.r_basias_lourd + s.r_sru_carencee
  )),
  score_v2_segment = (
    CASE
      WHEN s.couleur_mpr = 'bleu' AND LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
        + s.r_basias_lourd + s.r_sru_carencee
      )) >= 50 THEN 'mpr_bleu_prio'
      WHEN s.couleur_mpr = 'rose' AND LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
        + s.r_basias_lourd + s.r_sru_carencee
      )) >= 60 THEN 'premium'
      WHEN LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
        + s.r_basias_lourd + s.r_sru_carencee
      )) >= 40 THEN 'standard'
      ELSE 'cold'
    END
  ),
  score_v2_calculated_at = now()
FROM scored s
WHERE p.id = s.id;
