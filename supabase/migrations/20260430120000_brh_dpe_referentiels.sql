-- Migration BRH Habitat : Référentiels DPE 3CL 2021 (Tableaux de Valeurs)
-- Source : extraction CapRenov+ tv.db (44 tables)
-- Méthode officielle : arrêté du 8 octobre 2021 modifié
-- Date : 2026-04-30

-- IMPORTANT (règles BRH Habitat) :
-- - RLS activée sur toutes les tables
-- - Préfixe brh_dpe_* (nouvelle famille référentielle)
-- - Lecture publique (aides aux particuliers + pros), écriture admin only
-- - Pas de montants ici (référentiels purs), donc pas de _cents

-- ============================================================================
-- 1. TABLES "U" — Coefs de transmission thermique (W/m²·K)
-- ============================================================================

CREATE TABLE brh_dpe_umur (
  id SERIAL PRIMARY KEY,
  enum_periode_construction_id INT,
  periode_construction TEXT,
  enum_zone_climatique_id INT,
  zone_climatique TEXT,
  effet_joule INT,
  umur NUMERIC NOT NULL
);
CREATE INDEX idx_brh_dpe_umur_lookup ON brh_dpe_umur(enum_periode_construction_id, enum_zone_climatique_id, effet_joule);

CREATE TABLE brh_dpe_umur0 (
  id SERIAL PRIMARY KEY,
  enum_materiaux_structure_mur_id INT,
  materiaux_structure_mur TEXT,
  epaisseur_structure TEXT,
  umur0 NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_upb (
  id SERIAL PRIMARY KEY,
  enum_periode_construction_id INT,
  periode_construction TEXT,
  enum_zone_climatique_id INT,
  zone_climatique TEXT,
  effet_joule INT,
  upb NUMERIC NOT NULL
);
CREATE INDEX idx_brh_dpe_upb_lookup ON brh_dpe_upb(enum_periode_construction_id, enum_zone_climatique_id, effet_joule);

CREATE TABLE brh_dpe_upb0 (
  id SERIAL PRIMARY KEY,
  enum_type_plancher_bas_id INT,
  type_plancher_bas TEXT,
  upb0 NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_uph (
  id SERIAL PRIMARY KEY,
  enum_periode_construction_id INT,
  periode_construction TEXT,
  enum_zone_climatique_id INT,
  zone_climatique TEXT,
  effet_joule INT,
  type_toiture TEXT,
  uph NUMERIC NOT NULL
);
CREATE INDEX idx_brh_dpe_uph_lookup ON brh_dpe_uph(enum_periode_construction_id, enum_zone_climatique_id, type_toiture);

CREATE TABLE brh_dpe_uph0 (
  id SERIAL PRIMARY KEY,
  enum_type_plancher_haut_id INT,
  type_plancher_haut TEXT,
  uph0 NUMERIC NOT NULL
);

-- Vitrage (Ug) : selon gaz lame, inclinaison, type vitrage VIR, épaisseur lame
CREATE TABLE brh_dpe_ug (
  id SERIAL PRIMARY KEY,
  enum_type_gaz_lame_id INT,
  type_gaz_lame TEXT,
  enum_inclinaison_vitrage_id INT,
  inclinaison_vitrage TEXT,
  vitrage_vir NUMERIC,
  epaisseur_lame NUMERIC,
  enum_type_vitrage_id INT,
  type_vitrage TEXT,
  ug NUMERIC NOT NULL
);

-- Menuiserie (Uw) : selon type baie + matériaux + Ug
CREATE TABLE brh_dpe_uw (
  id SERIAL PRIMARY KEY,
  enum_type_baie_id INT,
  type_baie TEXT,
  enum_type_materiaux_menuiserie_id INT,
  type_materiaux_menuiserie TEXT,
  ug NUMERIC,
  uw NUMERIC NOT NULL
);
CREATE INDEX idx_brh_dpe_uw_lookup ON brh_dpe_uw(enum_type_baie_id, enum_type_materiaux_menuiserie_id);

-- Facteur solaire baie (Sw) : selon vitrage VIR et type pose
CREATE TABLE brh_dpe_sw (
  id SERIAL PRIMARY KEY,
  enum_type_baie_id INT,
  type_baie TEXT,
  enum_type_materiaux_menuiserie_id INT,
  type_materiaux_menuiserie TEXT,
  enum_type_pose_id INT,
  type_pose TEXT,
  vitrage_vir NUMERIC,
  enum_type_vitrage_id INT,
  type_vitrage TEXT,
  sw NUMERIC NOT NULL
);

-- Fermetures (delta R) selon type volet
CREATE TABLE brh_dpe_deltar (
  id SERIAL PRIMARY KEY,
  enum_type_fermeture_id INT,
  type_fermeture TEXT,
  deltar NUMERIC NOT NULL
);

-- Ujn (Uw avec fermeture) : table de calcul Uw + ΔR
CREATE TABLE brh_dpe_ujn (
  id SERIAL PRIMARY KEY,
  deltar NUMERIC,
  uw NUMERIC,
  ujn NUMERIC NOT NULL
);

-- Portes
CREATE TABLE brh_dpe_uporte (
  id SERIAL PRIMARY KEY,
  enum_type_porte_id INT,
  type_porte TEXT,
  uporte NUMERIC NOT NULL
);

-- Coefficient locaux non chauffés
CREATE TABLE brh_dpe_uvue (
  id SERIAL PRIMARY KEY,
  enum_type_adjacence_id INT,
  type_adjacence TEXT,
  uvue NUMERIC NOT NULL
);

-- Échangeur planchers / locaux
CREATE TABLE brh_dpe_ue (
  id SERIAL PRIMARY KEY,
  ratio_2sp INT,
  upb NUMERIC,
  type_adjacence_plancher TEXT,
  ue NUMERIC NOT NULL
);

-- ============================================================================
-- 2. TABLES "b" — Coefs réduction déperdition selon adjacence
-- ============================================================================
CREATE TABLE brh_dpe_coef_reduction_deperdition (
  id SERIAL PRIMARY KEY,
  enum_type_adjacence_id INT,
  type_adjacence TEXT,
  zone_climatique TEXT,
  uvue NUMERIC,
  enum_cfg_isolation_lnc_id NUMERIC,
  cfg_isolation_lnc TEXT,
  aiu_aue_min_excl NUMERIC,
  aiu_aue_max_incl NUMERIC,
  b NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_coef_reduction_deperdition_lnc (
  id SERIAL PRIMARY KEY,
  enum_type_adjacence_id TEXT,
  type_adjacence TEXT,
  uvue NUMERIC,
  enum_cfg_isolation_lnc_id INT,
  cfg_isolation_lnc TEXT,
  aiu_aue_min_excl NUMERIC,
  aiu_aue_max_incl NUMERIC,
  b NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_coef_reduction_deperdition_ets (
  id SERIAL PRIMARY KEY,
  enum_type_adjacence_id INT,
  type_adjacence TEXT,
  enum_zone_climatique_id TEXT,
  zone_climatique TEXT,
  enum_cfg_isolation_lnc_id INT,
  cfg_isolation_lnc TEXT,
  b NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_coef_reduction_deperdition_copi (
  id SERIAL PRIMARY KEY,
  enum_type_adjacence_id TEXT,
  type_adjacence TEXT,
  zone_climatique TEXT,
  uvue NUMERIC,
  enum_cfg_isolation_lnc_id NUMERIC,
  cfg_isolation_lnc TEXT,
  aiu_aue_min_excl NUMERIC,
  aiu_aue_max_incl NUMERIC,
  b NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_coef_transparence_ets (
  id SERIAL PRIMARY KEY,
  enum_type_materiaux_menuiserie_id TEXT,
  type_materiaux_menuiserie TEXT,
  enum_type_vitrage_id TEXT,
  type_vitrage TEXT,
  vitrage_vir NUMERIC,
  coef_transparence_ets NUMERIC NOT NULL
);

-- ============================================================================
-- 3. PONTS THERMIQUES (k en W/m·K)
-- ============================================================================
CREATE TABLE brh_dpe_pont_thermique (
  id SERIAL PRIMARY KEY,
  enum_type_liaison_id INT,
  type_liaison TEXT,
  isolation_mur TEXT,
  isolation_plancher TEXT,
  presence_retour_isolation NUMERIC,
  enum_type_pose_id NUMERIC,
  type_pose TEXT,
  largeur_dormant NUMERIC,
  k NUMERIC NOT NULL
);
CREATE INDEX idx_brh_dpe_pont_thermique_lookup ON brh_dpe_pont_thermique(enum_type_liaison_id, isolation_mur, isolation_plancher);

-- ============================================================================
-- 4. MASQUES SOLAIRES
-- ============================================================================
CREATE TABLE brh_dpe_coef_masque_proche (
  id SERIAL PRIMARY KEY,
  type_masque_cr TEXT,
  type_masque_proche TEXT,
  avancee TEXT,
  enum_orientation_id TEXT,
  orientation TEXT,
  fe1 NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_coef_masque_lointain_homogene (
  id SERIAL PRIMARY KEY,
  enum_orientation_id TEXT,
  orientation TEXT,
  hauteur_alpha TEXT,
  fe2 NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_coef_masque_lointain_non_homogene (
  id SERIAL PRIMARY KEY,
  secteur TEXT,
  enum_orientation_id TEXT,
  orientation TEXT,
  omb INT NOT NULL
);

-- ============================================================================
-- 5. PERMÉABILITÉ AIR & VENTILATION
-- ============================================================================
CREATE TABLE brh_dpe_q4pa_conv (
  id SERIAL PRIMARY KEY,
  enum_periode_construction_id TEXT,
  periode_construction TEXT,
  enum_methode_application_dpe_log_id TEXT,
  presence_joints_menuiserie NUMERIC,
  isolation_surfaces NUMERIC,
  type_habitation TEXT,
  q4pa_conv NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_debits_ventilation (
  id SERIAL PRIMARY KEY,
  enum_type_ventilation_id INT,
  type_ventilation TEXT,
  qvarep_conv NUMERIC,
  qvasouf_conv NUMERIC,
  smea_conv NUMERIC NOT NULL
);

-- ============================================================================
-- 6. RENDEMENTS GÉNÉRATEURS (chauffage + ECS)
-- ============================================================================
CREATE TABLE brh_dpe_rendement_emission (
  id SERIAL PRIMARY KEY,
  enum_type_emission_distribution_id TEXT,
  type_emission TEXT,
  re NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_rendement_distribution_ch (
  id SERIAL PRIMARY KEY,
  enum_type_emission_distribution_id TEXT,
  reseau_distribution TEXT,
  reseau_distribution_isole NUMERIC,
  rd NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_rendement_distribution_ecs (
  id SERIAL PRIMARY KEY,
  enum_type_installation_id TEXT,
  type_installation TEXT,
  configuration_logement TEXT,
  type_reseau_collectif TEXT,
  rd NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_rendement_regulation (
  id SERIAL PRIMARY KEY,
  enum_type_emission_distribution_id TEXT,
  type_emission_regulation TEXT,
  rr NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_rendement_generation (
  id SERIAL PRIMARY KEY,
  enum_type_generateur_ch_id TEXT,
  type_generateur_ch TEXT,
  rg NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_generateur_combustion (
  id SERIAL PRIMARY KEY,
  enum_type_generateur_ch_id TEXT,
  enum_type_generateur_ecs_id TEXT,
  type_generateur TEXT,
  critere_pn TEXT,
  pn TEXT,
  pn_min_excl INT,
  pn_max_incl INT,
  rpn TEXT,
  rpint TEXT,
  qp0_perc TEXT,
  pveil NUMERIC
);

CREATE TABLE brh_dpe_temp_fonc_30 (
  id SERIAL PRIMARY KEY,
  enum_temp_distribution_ch_id INT,
  temp_distribution_ch TEXT,
  periode_emetteurs TEXT,
  enum_type_generateur_ch_id TEXT,
  type_chaudiere TEXT,
  temp_fonc_30 NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_temp_fonc_100 (
  id SERIAL PRIMARY KEY,
  enum_temp_distribution_ch_id INT,
  temp_distribution_ch TEXT,
  periode_emetteurs TEXT,
  temp_fonc_100 INT NOT NULL
);

-- ============================================================================
-- 7. POMPES À CHALEUR & CLIMATISATION (SCOP/COP/SEER)
-- ============================================================================
CREATE TABLE brh_dpe_scop_ch (
  id SERIAL PRIMARY KEY,
  enum_zone_climatique_id TEXT,
  zone_climatique TEXT,
  enum_generateur_ch_id TEXT,
  type_generateur TEXT,
  enum_type_emission_ditribution_id TEXT,
  type_emetteur TEXT,
  scop_ou_cop TEXT,
  scop NUMERIC NOT NULL
);
CREATE INDEX idx_brh_dpe_scop_ch_lookup ON brh_dpe_scop_ch(enum_zone_climatique_id, enum_generateur_ch_id);

CREATE TABLE brh_dpe_scop_ecs (
  id SERIAL PRIMARY KEY,
  enum_zone_climatique_id TEXT,
  zone_climatique TEXT,
  enum_generateur_ecs_id TEXT,
  type_generateur TEXT,
  scop_ou_cop TEXT,
  scop NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_seer (
  id SERIAL PRIMARY KEY,
  enum_periode_installation_fr_id INT,
  periode_installation_fr TEXT,
  enum_zone_climatique_id TEXT,
  zone_climatique TEXT,
  seer_ou_eer TEXT,
  seer NUMERIC,
  eer NUMERIC
);

-- ============================================================================
-- 8. ECS — pertes stockage
-- ============================================================================
CREATE TABLE brh_dpe_pertes_stockage (
  id SERIAL PRIMARY KEY,
  enum_type_generateur_ecs_id TEXT,
  type_generateur_ecs TEXT,
  volume_stockage_min_exl INT,
  volume_stockage_max_incl INT,
  cr NUMERIC NOT NULL
);

-- ============================================================================
-- 9. INTERMITTENCE (i0) — table massive 54k+ lignes
-- ============================================================================
CREATE TABLE brh_dpe_intermittence (
  id SERIAL PRIMARY KEY,
  enum_methode_application_dpe_log_id TEXT,
  configuration_chauffage TEXT,
  enum_type_installation_id TEXT,
  enum_type_chauffage_id INT,
  type_chauffage TEXT,
  enum_equipement_intermittence_id INT,
  equipement_intermittence TEXT,
  enum_type_regulation_id INT,
  type_regulation TEXT,
  enum_type_emission_distribution_id TEXT,
  type_emission_simple TEXT,
  enum_classe_inertie_id TEXT,
  inertie TEXT,
  comptage_individuel TEXT,
  i0 NUMERIC NOT NULL
);
CREATE INDEX idx_brh_dpe_intermittence_lookup ON brh_dpe_intermittence(
  enum_methode_application_dpe_log_id,
  enum_type_chauffage_id,
  enum_type_regulation_id,
  enum_type_emission_distribution_id
);

-- ============================================================================
-- 10. SOLAIRE (FCS + orientation PV)
-- ============================================================================
CREATE TABLE brh_dpe_facteur_couverture_solaire (
  id SERIAL PRIMARY KEY,
  enum_zone_climatique_id INT,
  zone_climatique TEXT,
  enum_type_installation_solaire_id INT,
  type_installation_solaire TEXT,
  type_batiment TEXT,
  usage TEXT,
  facteur_couverture_solaire NUMERIC NOT NULL
);

CREATE TABLE brh_dpe_coef_orientation_pv (
  id SERIAL PRIMARY KEY,
  enum_inclinaison_pv_id INT,
  inclinaison_pv TEXT,
  enum_orientation_pv_id INT,
  orientation_pv TEXT,
  coef_orientation_pv NUMERIC NOT NULL
);

-- ============================================================================
-- 11. RÉSEAUX DE CHALEUR (CO2 + ENR par département)
-- ============================================================================
CREATE TABLE brh_dpe_reseau_chaleur_2020 (
  id SERIAL PRIMARY KEY,
  departement INT,
  hash_reseau TEXT,
  nom_reseau TEXT,
  localisation TEXT,
  chaud_ou_froid TEXT,
  contenu_co2 NUMERIC,
  taux_enr NUMERIC,
  est_vertueux NUMERIC
);

CREATE TABLE brh_dpe_reseau_chaleur_2021 (
  id SERIAL PRIMARY KEY,
  identifiant_reseau TEXT,
  departement TEXT,
  nom_reseau TEXT,
  localisation TEXT,
  contenu_co2 NUMERIC,
  contenu_co2_acv NUMERIC,
  taux_enr TEXT,
  methode_calcul_taux TEXT,
  nouveau_reseau_2020_2021 INT,
  correspondance_tv_reseau_chaleur_id_2020 NUMERIC,
  correspondance_hash_reseau_2020 TEXT
);

CREATE TABLE brh_dpe_reseau_chaleur_2022 (
  id SERIAL PRIMARY KEY,
  identifiant_reseau TEXT,
  departement INT,
  nom_reseau TEXT,
  localisation TEXT,
  contenu_co2 NUMERIC,
  contenu_co2_acv NUMERIC,
  taux_enr TEXT,
  methode_calcul_taux TEXT,
  nouveau_reseau_2021_2022 INT
);

-- ============================================================================
-- 12. SEUILS DPE (étiquettes A→G)
-- ============================================================================
CREATE TABLE brh_dpe_seuils (
  id SERIAL PRIMARY KEY,
  critere_altitude_zone_clim INT,
  surface INT,
  cep_a INT, ges_a INT,
  cep_b INT, ges_b INT,
  cep_c INT, ges_c INT,
  cep_d INT, ges_d INT,
  cep_e INT, ges_e INT,
  cep_f INT, ges_f INT
);

-- ============================================================================
-- 13. ZONES CLIMATIQUES (mapping département → zone H1A...H3 + altitude)
-- ============================================================================
CREATE TABLE brh_dpe_zones_climatiques (
  id SERIAL PRIMARY KEY,
  departement_numero VARCHAR(3) NOT NULL,
  zone_climatique TEXT NOT NULL,  -- H1a, H1b, H1c, H2a, H2b, H2c, H2d, H3
  altitude_min INT,
  altitude_max INT
);
CREATE INDEX idx_brh_dpe_zones_dept ON brh_dpe_zones_climatiques(departement_numero);

-- ============================================================================
-- RLS — toutes les tables référentielles : SELECT public, INSERT/UPDATE admin
-- ============================================================================
DO $$
DECLARE tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname='public' AND tablename LIKE 'brh_dpe_%'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format($f$
      CREATE POLICY "%I_select_public" ON %I
      FOR SELECT TO anon, authenticated USING (true)
    $f$, tbl, tbl);
    EXECUTE format($f$
      CREATE POLICY "%I_admin_write" ON %I
      FOR ALL TO authenticated
      USING (
        EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
    $f$, tbl, tbl);
  END LOOP;
END $$;
