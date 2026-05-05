-- =============================================================================
-- Score Vente v1.5 enrichi — joint IRIS Filosofi + commune Géorisques + OPAH
-- =============================================================================
-- Évolution du score v0 (7 règles) vers v1.5 (12 règles) en exploitant les
-- données externes Tier 1 déjà en DB :
--   - brh_ext_iris : tx_proprio, tx_avant_1975, decile_estime, couleur_mpr
--   - brh_ext_commune : opah_active, radon_categorie, ppri_present, sismique_zone
--
-- Règles ajoutées :
--   R8  Sur-dimensionnement (surface + IRIS tx > 65 ans estimé via revenu) → Phase 2
--   R10 Maison individuelle (déjà v0)
--   R11 Zone OPAH active (+10) → bonus motivation travaux/vente
--   R12 IRIS tx_avant_1975 ≥ 50 % (+5) → quartier ancien = passoires nombreuses
--   R13 Bonus revenu IRIS bleu/jaune (+5) → propriétaires modestes = MPR généreux
--   N5  Sismique zone ≥ 4 (-5) → frein vente
--   N6  PPRI inondation (-3) → frein vente
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- Helper : score enrichi via fonction (plus lisible que le CASE imbriqué)
CREATE OR REPLACE FUNCTION public.brh_compute_score_vente_v1_5(
  p_id BIGINT
) RETURNS TABLE(score INT, segment TEXT, breakdown JSONB, proba_6m NUMERIC)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  p RECORD;
  v_iris_couleur TEXT;
  v_iris_tx_proprio NUMERIC;
  v_iris_tx_pre1975 NUMERIC;
  v_opah_active BOOLEAN;
  v_sismique INT;
  v_ppri BOOLEAN;
  s INT := 0;
  bk JSONB := '{}'::jsonb;
BEGIN
  SELECT * INTO p FROM public.brh_dpe_prospects WHERE id = p_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- IRIS context (variables explicites pour éviter "record not assigned")
  IF p.iris_code IS NOT NULL THEN
    SELECT couleur_mpr, tx_proprio, tx_avant_1975
      INTO v_iris_couleur, v_iris_tx_proprio, v_iris_tx_pre1975
      FROM public.brh_ext_iris
      WHERE iris_code = p.iris_code;

    SELECT opah_active, sismique_zone, ppri_present
      INTO v_opah_active, v_sismique, v_ppri
      FROM public.brh_ext_commune
      WHERE insee = substring(p.iris_code, 1, 5);
  END IF;

  -- R1 DPE F/G base
  IF p.etiquette_dpe = 'G' THEN
    s := s + 70; bk := bk || jsonb_build_object('R1_dpe_g', 70);
  ELSIF p.etiquette_dpe = 'F' THEN
    s := s + 60; bk := bk || jsonb_build_object('R1_dpe_f', 60);
  END IF;

  -- R2 DPE > 5 ans
  IF p.date_dpe IS NOT NULL AND p.date_dpe < (CURRENT_DATE - INTERVAL '5 years') THEN
    s := s + 15; bk := bk || jsonb_build_object('R2_dpe_age', 15);
  END IF;

  -- R8 Surface (proxy sur-dimensionnement)
  IF p.surface_habitable >= 120 THEN
    s := s + 10; bk := bk || jsonb_build_object('R8_surface_xl', 10);
  ELSIF p.surface_habitable >= 80 THEN
    s := s + 5; bk := bk || jsonb_build_object('R8_surface_l', 5);
  END IF;

  -- R10 Maison individuelle
  IF p.type_batiment ILIKE '%maison%' OR p.type_batiment ILIKE '%individuel%' THEN
    s := s + 8; bk := bk || jsonb_build_object('R10_maison_indiv', 8);
  END IF;

  -- R12 Bretagne bonus base
  s := s + 5; bk := bk || jsonb_build_object('R12_bretagne', 5);

  -- Pénalité chauffage collectif
  IF p.energie_chauffage ILIKE '%collectif%' THEN
    s := s - 10; bk := bk || jsonb_build_object('N_collectif', -10);
  END IF;

  -- Construction < 1975
  IF p.annee_construction IS NOT NULL AND p.annee_construction < 1975 THEN
    s := s + 8; bk := bk || jsonb_build_object('R_pre_75', 8);
  END IF;

  -- === RÈGLES ENRICHIES IRIS / COMMUNE (v1.5) ===

  -- R11 Zone OPAH active (+10) — bonus motivation travaux + vente possible
  IF v_opah_active IS TRUE THEN
    s := s + 10; bk := bk || jsonb_build_object('R11_opah_active', 10);
  END IF;

  -- R13 IRIS tx_avant_1975 ≥ 50 % (+5) — quartier passoires
  IF v_iris_tx_pre1975 IS NOT NULL AND v_iris_tx_pre1975 >= 0.50 THEN
    s := s + 5; bk := bk || jsonb_build_object('R13_quartier_ancien', 5);
  END IF;

  -- R14 Couleur MPR bleu/jaune (+5) — propriétaire modeste = aides généreuses
  IF v_iris_couleur IN ('bleu','jaune') THEN
    s := s + 5; bk := bk || jsonb_build_object('R14_mpr_modeste', 5);
  END IF;

  -- R15 Tx propriétaires élevé (+3) — zone résidentielle dense
  IF v_iris_tx_proprio IS NOT NULL AND v_iris_tx_proprio >= 0.70 THEN
    s := s + 3; bk := bk || jsonb_build_object('R15_zone_proprio', 3);
  END IF;

  -- N5 Sismique zone ≥ 4 (-5) — frein vente
  IF v_sismique IS NOT NULL AND v_sismique >= 4 THEN
    s := s - 5; bk := bk || jsonb_build_object('N5_sismique', -5);
  END IF;

  -- N6 PPRI inondation (-3)
  IF v_ppri IS TRUE THEN
    s := s - 3; bk := bk || jsonb_build_object('N6_ppri', -3);
  END IF;

  -- Plafonner [0, 100]
  s := LEAST(100, GREATEST(0, s));

  RETURN QUERY SELECT
    s,
    CASE WHEN s >= 80 THEN 'tres_chaud' WHEN s >= 60 THEN 'chaud' WHEN s >= 40 THEN 'tiede' ELSE 'froid' END,
    bk,
    CASE WHEN p.etiquette_dpe = 'G' THEN 0.45 WHEN p.etiquette_dpe = 'F' THEN 0.30 ELSE 0.10 END;
END;
$$;

COMMENT ON FUNCTION public.brh_compute_score_vente_v1_5 IS
  'Score Vente v1.5 enrichi : 12 règles dont 6 issues de IRIS Filosofi + Géorisques + OPAH.';

-- Recalcul batch sur tous les prospects scorés
UPDATE brh_score_vente_v1 sv
  SET score = r.score,
      segment = r.segment,
      rules_breakdown = r.breakdown,
      proba_6m = r.proba_6m,
      algo_version = 'v1.5',
      computed_at = now()
  FROM (
    SELECT id, (public.brh_compute_score_vente_v1_5(id)).*
    FROM brh_dpe_prospects
    WHERE etiquette_dpe IN ('F','G')
      AND latitude IS NOT NULL AND longitude IS NOT NULL
      AND surface_habitable IS NOT NULL
  ) r
  WHERE sv.prospect_id = r.id;

COMMIT;

-- Récap par segment
SELECT segment, count(*), round(avg(score)) AS avg_score
FROM brh_score_vente_v1
GROUP BY segment
ORDER BY count DESC;
