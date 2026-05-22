-- 2026-05-22 — Phase nuit — Recalc score V2 DPE E avec règles communales
--
-- CONTEXTE :
--   Suite à l'enrichissement nocturne code_insee sur 124 437 DPE E
--   (Phase 21/05 nuit, API BAN reverse), on peut désormais activer les
--   règles score V2 dépendant de `brh_ext_commune`.
--
--   Score V2 actuel sur E : min=5 avg=5 max=5 (juste r_classe E=5)
--   Score V2 attendu après recalc : min=5 avg=15-25 max=60 (selon commune)
--
-- RÈGLES COMMUNALES ACTIVÉES (sur 22 totales, les 14 IRIS restent NULL) :
--   r_rga, r_radon, r_concur, r_gentrif, r_opah, r_sitadel,
--   r_tlv_tendue, r_lovac, r_audits_dyna, r_abf_lourd, r_pop_growth,
--   r_catnat_lourd, r_basias_lourd, r_sru_carencee
--
-- NOTE :
--   r_dju_eleve (DJU > 2700) nécessite la colonne dju_18_normal qui
--   est dans brh_ext_commune, donc activée aussi.

WITH scored AS (
  SELECT
    p.id,
    p.etiquette_dpe,
    p.dvf_mutation_24m,
    p.has_pv_36kw,
    p.enedis_kwh_logt,
    c.rga_alea,
    c.radon_categorie,
    c.nb_rge_isolation,
    c.prix_m2_growth_3y,
    c.opah_active,
    c.opah_type,
    c.nb_dp_logements_existants_12m,
    c.dju_18_normal,
    c.tlv_tendue,
    c.tlv_zonage,
    c.lovac_tx_vacance_long,
    c.audits_ademe_count,
    c.merimee_count,
    c.evolution_pop_16_22,
    c.catnat_total,
    c.catnat_inondation,
    c.basias_count,
    c.sru_carencee,
    c.abf_ac1_count,
    -- Règles non-IRIS applicables aux DPE E
    CASE WHEN p.dvf_mutation_24m AND p.etiquette_dpe = 'E' THEN 20 ELSE 0 END AS r_mut_e,
    5 AS r_classe_e,
    CASE WHEN p.enedis_kwh_logt > 250 THEN 15 ELSE 0 END AS r_enedis,
    CASE WHEN p.has_pv_36kw THEN -10 ELSE 0 END AS r_pv,
    CASE WHEN c.rga_alea = 'fort' THEN 10 ELSE 0 END AS r_rga,
    CASE WHEN c.radon_categorie = 3 THEN 10 ELSE 0 END AS r_radon,
    CASE WHEN c.nb_rge_isolation IS NOT NULL AND c.nb_rge_isolation < 5 THEN 5 ELSE 0 END AS r_concur,
    CASE WHEN c.prix_m2_growth_3y > 0.15 THEN 7 ELSE 0 END AS r_gentrif,
    CASE WHEN c.opah_active THEN 8 ELSE 0 END AS r_opah,
    CASE WHEN c.nb_dp_logements_existants_12m > 50 THEN 5 ELSE 0 END AS r_sitadel,
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
  LEFT JOIN brh_ext_commune c ON c.insee::text = p.code_insee
  WHERE p.etiquette_dpe = 'E'
    AND p.code_insee IS NOT NULL
    AND p.departement IN ('22','29','35','44','56')
)
UPDATE brh_dpe_prospects p
SET score_v2 = LEAST(100, GREATEST(0,
    s.r_mut_e + s.r_classe_e + s.r_enedis + s.r_pv
    + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif
    + s.r_opah + s.r_sitadel + s.r_dju_eleve
    + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna
    + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
    + s.r_basias_lourd + s.r_sru_carencee
))::smallint
FROM scored s
WHERE p.id = s.id;

DO $$
DECLARE
  v_count bigint;
  v_avg numeric;
  v_max int;
BEGIN
  SELECT COUNT(*), AVG(score_v2)::numeric(5,1), MAX(score_v2)
  INTO v_count, v_avg, v_max
  FROM brh_dpe_prospects
  WHERE etiquette_dpe = 'E' AND code_insee IS NOT NULL
    AND departement IN ('22','29','35','44','56');
  RAISE NOTICE 'DPE E recalc : % rows, avg=%, max=%', v_count, v_avg, v_max;
END $$;
