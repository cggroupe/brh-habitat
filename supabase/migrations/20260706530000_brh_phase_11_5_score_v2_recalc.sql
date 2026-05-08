-- Phase 11.5 — Score v2 20 règles (Phase 11.4 + 2 nouvelles)
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
    -- 18 règles existantes
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
    CASE WHEN c.merimee_count >= 5 THEN -5 ELSE 0 END AS r_abf_lourd,
    -- NEW r19 : population croissance > 5% (commune attractive = marché actif)
    CASE WHEN c.evolution_pop_16_22 > 0.05 THEN 5 ELSE 0 END AS r_pop_growth,
    -- NEW r20 : Cat-Nat lourd (≥5 arrêtés ou ≥3 inondations) = risque sinistralité
    CASE WHEN c.catnat_total >= 5 OR c.catnat_inondation >= 3 THEN -3 ELSE 0 END AS r_catnat_lourd
  FROM brh_dpe_prospects p
  LEFT JOIN brh_ext_iris i ON i.iris_code = p.iris_code
  LEFT JOIN brh_ext_commune c ON c.insee::text = substr(p.iris_code, 1, 5)
)
UPDATE brh_dpe_prospects p
SET
  score_v2 = LEAST(100, GREATEST(0,
    s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon
    + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
    + s.r_opah + s.r_sitadel + s.r_fg
    + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
    + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna
    + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
  ))::smallint,
  score_v2_breakdown = jsonb_build_object(
    'rules', (
      SELECT jsonb_agg(r ORDER BY (r->>'points')::int DESC) FROM (
        SELECT jsonb_build_object('rule','mutation_24m_FG','points',s.r_mut_fg) AS r WHERE s.r_mut_fg > 0
        UNION ALL SELECT jsonb_build_object('rule', CASE WHEN s.couleur_mpr='bleu' THEN 'mpr_bleu' ELSE 'mpr_jaune' END, 'points', s.r_mpr, 'couleur', s.couleur_mpr) WHERE s.r_mpr > 0
        UNION ALL SELECT jsonb_build_object('rule','enedis_overuse','points',s.r_enedis,'kwh_logt',s.enedis_kwh_logt) WHERE s.r_enedis > 0
        UNION ALL SELECT jsonb_build_object('rule','rga_fort','points',s.r_rga) WHERE s.r_rga > 0
        UNION ALL SELECT jsonb_build_object('rule','radon_z3','points',s.r_radon) WHERE s.r_radon > 0
        UNION ALL SELECT jsonb_build_object('rule','low_concurrence','points',s.r_concur) WHERE s.r_concur > 0
        UNION ALL SELECT jsonb_build_object('rule','gentrif','points',s.r_gentrif,'growth_3y',s.prix_m2_growth_3y) WHERE s.r_gentrif > 0
        UNION ALL SELECT jsonb_build_object('rule','pv_existing','points',s.r_pv) WHERE s.r_pv < 0
        UNION ALL SELECT jsonb_build_object('rule','precarite_max','points',s.r_precar) WHERE s.r_precar > 0
        UNION ALL SELECT jsonb_build_object('rule','opah_active','points',s.r_opah,'type',s.opah_type) WHERE s.r_opah > 0
        UNION ALL SELECT jsonb_build_object('rule','sitadel_dynamism','points',s.r_sitadel) WHERE s.r_sitadel > 0
        UNION ALL SELECT jsonb_build_object('rule','dpe_fg','points',s.r_fg,'etiquette',s.etiquette_dpe::text) WHERE s.r_fg > 0
        UNION ALL SELECT jsonb_build_object('rule','iris_proprio_ancien','points',s.r_proprio_ancien) WHERE s.r_proprio_ancien > 0
        UNION ALL SELECT jsonb_build_object('rule','vacance_iris_struct','points',s.r_vacance) WHERE s.r_vacance > 0
        UNION ALL SELECT jsonb_build_object('rule','dju_eleve','points',s.r_dju_eleve,'dju',s.dju_18_normal) WHERE s.r_dju_eleve > 0
        UNION ALL SELECT jsonb_build_object('rule','zone_tendue','points',s.r_tlv_tendue,'zonage',s.tlv_zonage) WHERE s.r_tlv_tendue > 0
        UNION ALL SELECT jsonb_build_object('rule','lovac_long','points',s.r_lovac) WHERE s.r_lovac > 0
        UNION ALL SELECT jsonb_build_object('rule','audits_dyna','points',s.r_audits_dyna,'audits',s.audits_ademe_count) WHERE s.r_audits_dyna > 0
        UNION ALL SELECT jsonb_build_object('rule','abf_lourd','points',s.r_abf_lourd,'merimee_n',s.merimee_count) WHERE s.r_abf_lourd < 0
        UNION ALL SELECT jsonb_build_object('rule','population_growth','points',s.r_pop_growth,'evol_16_22',s.evolution_pop_16_22) WHERE s.r_pop_growth > 0
        UNION ALL SELECT jsonb_build_object('rule','catnat_lourd','points',s.r_catnat_lourd,'total',s.catnat_total,'inond',s.catnat_inondation) WHERE s.r_catnat_lourd < 0
      ) sub
    ),
    'iris_code', s.iris_code,
    'commune_insee', substr(s.iris_code, 1, 5),
    'climat_futur_2050', jsonb_build_object('delta_dju', s.delta_dju_2050)
  ),
  score_v2_segment = (
    CASE
      WHEN LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
      )) >= 80 THEN 'ultra_chaud'
      WHEN s.couleur_mpr = 'bleu' AND LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
      )) >= 50 THEN 'mpr_bleu_prio'
      WHEN s.couleur_mpr = 'rose' AND LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
      )) >= 60 THEN 'premium'
      WHEN LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
      )) >= 40 THEN 'standard'
      ELSE 'cold'
    END
  ),
  score_v2_calculated_at = now()
FROM scored s WHERE p.id = s.id;
