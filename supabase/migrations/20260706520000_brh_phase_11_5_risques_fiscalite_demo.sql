-- Phase 11.5 — Risques pollution + fiscalité locale + démographie + score 20 règles

-- Population
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS population_2008 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS population_2016 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS population_2022 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS evolution_pop_16_22 NUMERIC(6,4);

-- Cat-Nat
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_total INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_inondation INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_tempete INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_secheresse INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS catnat_last_date TEXT;

-- Sites pollués + ICPE
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS basias_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS basol_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS icpe_count INTEGER DEFAULT 0;

-- Fiscalité locale (DGFiP 2023)
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS taux_tfb NUMERIC(6,3);
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS taux_tfnb NUMERIC(6,3);
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS taux_th NUMERIC(6,3);
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS taux_teom NUMERIC(6,3);

-- Audits ADEME (déjà ajouté Phase 11.3 mais idempotent)
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS audits_ademe_count INTEGER DEFAULT 0;

-- Index utiles
CREATE INDEX IF NOT EXISTS brh_ext_commune_catnat_lourd ON brh_ext_commune (catnat_total) WHERE catnat_total >= 5;
CREATE INDEX IF NOT EXISTS brh_ext_commune_pop_growth ON brh_ext_commune (evolution_pop_16_22) WHERE evolution_pop_16_22 > 0;
CREATE INDEX IF NOT EXISTS brh_ext_commune_basias ON brh_ext_commune (basias_count DESC) WHERE basias_count > 0;
