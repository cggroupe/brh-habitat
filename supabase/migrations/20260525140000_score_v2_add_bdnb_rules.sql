-- =============================================================================
-- 2026-05-25 — Phase 3.5 : score V2 +3 règles BDNB (typologie bâti)
-- =============================================================================
--
-- CONTEXTE :
--   brh_ext_bdnb_batiments chargée Phase 3.4 (1.55M lignes, 4 dépts bretons).
--   Joint à brh_dpe_prospects via adresse_ban_id (en cours d'enrichissement
--   en background depuis Phase 1.2).
--
-- AJOUT 3 RÈGLES (passage de 22 → 25 règles) :
--   r_vitrage_simple : +5 pts si type_vitrage = 'simple vitrage' AND annee < 1990
--   r_pierre_ancienne : +3 pts si mat_mur_txt LIKE '%PIERRE%' AND annee < 1900
--   r_grand_logement : +3 pts si surface >= 150 AND etiquette ∈ (E,F,G)
--
-- IMPACT ATTENDU :
--   Limité tant que adresse_ban_id pas finalisé sur DPE (~1.5% au déploiement).
--   La fonction est idempotente — relancée à mesure que la couverture monte.
--
-- USAGE post-migration :
--   SELECT brh_recalc_score_v2_full('22');  -- ~26-59s par dept (observé)
--   SELECT brh_recalc_score_v2_full('29');
--   SELECT brh_recalc_score_v2_full('35');
--   SELECT brh_recalc_score_v2_full('44');
--   SELECT brh_recalc_score_v2_full('56');
-- =============================================================================

CREATE OR REPLACE FUNCTION public.brh_recalc_score_v2_full(p_dept TEXT)
RETURNS TABLE (dept TEXT, rows_updated BIGINT, avg_score NUMERIC, max_score INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated BIGINT;
BEGIN
  WITH scored AS (
    SELECT
      p.id, p.iris_code, p.etiquette_dpe, p.dvf_mutation_24m, p.has_pv_36kw, p.enedis_kwh_logt,
      i.couleur_mpr, i.decile_estime, i.thermosens_kwh_dj,
      i.tx_proprio, i.tx_avant_1975, i.tx_vacance_log,
      c.rga_alea, c.radon_categorie, c.nb_rge_isolation,
      c.prix_m2_growth_3y, c.opah_active,
      c.nb_dp_logements_existants_12m, c.dju_18_normal,
      c.tlv_tendue, c.lovac_tx_vacance_long,
      c.audits_ademe_count, c.merimee_count,
      c.evolution_pop_16_22, c.catnat_total, c.catnat_inondation,
      c.basias_count, c.sru_carencee, c.abf_ac1_count,
      -- 22 règles existantes (cf migration 20260524140000)
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
      CASE WHEN c.sru_carencee THEN 5 ELSE 0 END AS r_sru_carencee,
      -- 3 nouvelles règles BDNB
      CASE WHEN b.type_vitrage = 'simple vitrage' AND b.annee_construction IS NOT NULL AND b.annee_construction < 1990 THEN 5 ELSE 0 END AS r_vitrage_simple,
      CASE WHEN b.mat_mur_txt ILIKE '%PIERRE%' AND b.annee_construction IS NOT NULL AND b.annee_construction < 1900 THEN 3 ELSE 0 END AS r_pierre_ancienne,
      CASE WHEN b.surface_habitable_logement >= 150 AND p.etiquette_dpe IN ('E','F','G') THEN 3 ELSE 0 END AS r_grand_logement
    FROM public.brh_dpe_prospects p
    LEFT JOIN public.brh_ext_iris i ON i.iris_code = p.iris_code
    LEFT JOIN public.brh_ext_commune c ON c.insee::text = substr(p.iris_code, 1, 5)
    LEFT JOIN public.brh_ext_bdnb_batiments b ON b.ban_id = p.adresse_ban_id
    WHERE p.departement = p_dept
  ),
  updated AS (
    UPDATE public.brh_dpe_prospects p
    SET
      score_v2 = LEAST(100, GREATEST(0,
        s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon
        + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
        + s.r_opah + s.r_sitadel + s.r_fg
        + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
        + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
        + s.r_basias_lourd + s.r_sru_carencee
        + s.r_vitrage_simple + s.r_pierre_ancienne + s.r_grand_logement
      )),
      score_v2_segment = (
        CASE
          WHEN s.couleur_mpr = 'bleu' AND LEAST(100, GREATEST(0,
            s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
            + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
            + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
            + s.r_basias_lourd + s.r_sru_carencee
            + s.r_vitrage_simple + s.r_pierre_ancienne + s.r_grand_logement
          )) >= 50 THEN 'mpr_bleu_prio'
          WHEN s.couleur_mpr = 'rose' AND LEAST(100, GREATEST(0,
            s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
            + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
            + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
            + s.r_basias_lourd + s.r_sru_carencee
            + s.r_vitrage_simple + s.r_pierre_ancienne + s.r_grand_logement
          )) >= 60 THEN 'premium'
          WHEN LEAST(100, GREATEST(0,
            s.r_mut_fg + s.r_mpr + s.r_enedis + s.r_rga + s.r_radon + s.r_concur + s.r_gentrif + s.r_pv + s.r_precar
            + s.r_opah + s.r_sitadel + s.r_fg + s.r_proprio_ancien + s.r_vacance + s.r_dju_eleve
            + s.r_tlv_tendue + s.r_lovac + s.r_audits_dyna + s.r_abf_lourd + s.r_pop_growth + s.r_catnat_lourd
            + s.r_basias_lourd + s.r_sru_carencee
            + s.r_vitrage_simple + s.r_pierre_ancienne + s.r_grand_logement
          )) >= 40 THEN 'standard'
          ELSE 'cold'
        END
      ),
      score_v2_calculated_at = now()
    FROM scored s
    WHERE p.id = s.id
    RETURNING p.id, p.score_v2
  )
  SELECT p_dept, count(*)::BIGINT, round(avg(score_v2)::numeric, 2), max(score_v2)
    INTO dept, rows_updated, avg_score, max_score
    FROM updated;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.brh_recalc_score_v2_full(TEXT) IS
  'Phase 3.5 (25/05) — Recalc score V2 25 règles (22 existantes + 3 BDNB) pour un département. Idempotente. À appeler dept-par-dept pour éviter timeout (~30-60s par dept observé).';

GRANT EXECUTE ON FUNCTION public.brh_recalc_score_v2_full(TEXT) TO authenticated;
