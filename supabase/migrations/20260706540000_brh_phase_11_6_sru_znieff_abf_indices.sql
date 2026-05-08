-- Phase 11.6 — SRU + ZNIEFF + ABF/SUP AC1 + indices d'optimisation

-- SRU communes
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS sru_assujettie BOOLEAN DEFAULT FALSE;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS sru_deficitaire BOOLEAN DEFAULT FALSE;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS sru_carencee BOOLEAN DEFAULT FALSE;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS sru_taux_lls NUMERIC(5,4);

-- ZNIEFF
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS znieff1_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS znieff2_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS znieff_sample TEXT;

-- ABF / SUP servitudes
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS abf_ac1_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS lignes_ht_count INTEGER DEFAULT 0;

-- Indices d'optimisation pour scoring/filtres
CREATE INDEX IF NOT EXISTS brh_ext_commune_basias_lourd ON brh_ext_commune (basias_count DESC) WHERE basias_count > 50;
CREATE INDEX IF NOT EXISTS brh_ext_commune_icpe_lourd ON brh_ext_commune (icpe_count DESC) WHERE icpe_count > 50;
CREATE INDEX IF NOT EXISTS brh_ext_commune_catnat_lourd ON brh_ext_commune (catnat_total DESC) WHERE catnat_total >= 5;
CREATE INDEX IF NOT EXISTS brh_ext_commune_pop_growth ON brh_ext_commune (evolution_pop_16_22 DESC) WHERE evolution_pop_16_22 > 0.05;
CREATE INDEX IF NOT EXISTS brh_ext_commune_tlv_tendue ON brh_ext_commune (tlv_tendue) WHERE tlv_tendue = TRUE;
CREATE INDEX IF NOT EXISTS brh_ext_commune_audits_dyna ON brh_ext_commune (audits_ademe_count DESC) WHERE audits_ademe_count > 100;
CREATE INDEX IF NOT EXISTS brh_ext_commune_taux_low ON brh_ext_commune (taux_tfb) WHERE taux_tfb IS NOT NULL AND taux_tfb < 30;
CREATE INDEX IF NOT EXISTS brh_ext_commune_sru_carencee ON brh_ext_commune (sru_carencee) WHERE sru_carencee = TRUE;
