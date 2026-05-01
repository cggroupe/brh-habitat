-- Migration Phase 11.1 — Tier 1 socle scoring (sources externes prospection)
-- Plan : docs/wiki/external-data-sources.md § Tier 1
-- ADR : voir log.md entrée 2026-05-01 Phase 11.0
--
-- Tables créées :
--   1. brh_ext_cache             — cache générique APIs externes (TTL 30j par défaut)
--   2. brh_ext_iris              — données IRIS pré-jointes (Filosofi + Recensement + Enedis + GRDF)
--   3. brh_ext_commune           — données commune-level (Géorisques, ANAH, RGE, Sit@del2, Météo-France)
--
-- ALTER : brh_dpe_prospects (+8 colonnes scoring v2)
--
-- RLS : pro+admin uniquement (anon n'accède pas — il utilise dpe-express-lookup côté simulateur)
-- Convention BRH : préfixe brh_ext_* distinct de brh_dpe_* (CapRénov+) et brh_* (business)

-- ============================================================================
-- 1. brh_ext_cache — Cache générique des appels APIs externes
-- ============================================================================
CREATE TABLE brh_ext_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                -- 'enedis'|'grdf'|'georisques'|'filosofi'|'dvf'|...
  cache_key TEXT NOT NULL,             -- ex: 'commune:35238' ou 'addr:12_rue_x_35000'
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INT NOT NULL DEFAULT 2592000,  -- 30j par défaut
  UNIQUE(source, cache_key)
);

CREATE INDEX brh_ext_cache_lookup ON brh_ext_cache(source, cache_key, fetched_at);

COMMENT ON TABLE brh_ext_cache IS
  'Cache générique APIs externes (Enedis, GRDF, Géorisques, etc.). TTL 30j par défaut, 90j pour Géorisques. Manipulé exclusivement par EF (service_role).';

-- ============================================================================
-- 2. brh_ext_iris — Données IRIS pré-jointes (≈2800 IRIS Bretagne)
-- ============================================================================
CREATE TABLE brh_ext_iris (
  iris_code CHAR(9) PRIMARY KEY,
  commune_insee CHAR(5) NOT NULL,

  -- Filosofi 2021 (INSEE — barème revenus)
  med21 NUMERIC(8,2),                  -- médiane revenu disponible UC
  d121 NUMERIC(8,2),                   -- 1er décile
  d921 NUMERIC(8,2),                   -- 9e décile
  decile_estime SMALLINT,              -- 1-10 (calculé depuis med21 vs barème INSEE national 2024-2026)
  couleur_mpr TEXT CHECK (couleur_mpr IN ('bleu', 'jaune', 'violet', 'rose')),

  -- Recensement Logement INSEE 2022
  tx_proprio NUMERIC(4,3),             -- 0-1 (proportion propriétaires occupants)
  tx_avant_1975 NUMERIC(4,3),          -- 0-1 (logements antérieurs RT 1974)

  -- Enedis IRIS
  thermosens_kwh_dj NUMERIC(8,2),      -- thermosensibilité kWh/DJ (chauffage électrique dominant)
  conso_resid_kwh_an BIGINT,           -- conso résidentielle annuelle IRIS

  -- GRDF IRIS
  conso_gaz_mwh_an BIGINT,             -- conso gaz résidentiel annuel IRIS
  pdl_gaz_resid INT,                   -- nombre PDL gaz résidentiels

  -- Méta
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brh_ext_iris_commune ON brh_ext_iris(commune_insee);
CREATE INDEX brh_ext_iris_couleur ON brh_ext_iris(couleur_mpr) WHERE couleur_mpr IS NOT NULL;
CREATE INDEX brh_ext_iris_decile ON brh_ext_iris(decile_estime) WHERE decile_estime IS NOT NULL;

COMMENT ON TABLE brh_ext_iris IS
  'Données IRIS pré-jointes (Filosofi 2021 + Recensement Logement 2022 + Enedis + GRDF). Évite N+1 sur les 59k prospects. ~2800 IRIS Bretagne.';

-- ============================================================================
-- 3. brh_ext_commune — Données commune-level (≈1208 communes Bretagne)
-- ============================================================================
CREATE TABLE brh_ext_commune (
  insee CHAR(5) PRIMARY KEY,

  -- Géorisques (BRGM/MTE)
  radon_categorie SMALLINT CHECK (radon_categorie BETWEEN 1 AND 3),
  rga_alea TEXT CHECK (rga_alea IN ('faible', 'moyen', 'fort')),
  ppri_present BOOLEAN NOT NULL DEFAULT false,
  sismique_zone SMALLINT CHECK (sismique_zone BETWEEN 1 AND 5),

  -- ANAH (OPAH/PIG actifs)
  opah_active BOOLEAN NOT NULL DEFAULT false,
  opah_type TEXT CHECK (opah_type IN ('OPAH', 'OPAH-RU', 'OPAH-CD', 'PIG')),
  opah_operateur TEXT,
  opah_fin_validite DATE,

  -- LOVAC (vacance structurelle ≥11 logts uniquement)
  tx_vacance_struct NUMERIC(4,3),

  -- Concurrence RGE (annuaire ADEME)
  nb_rge_isolation SMALLINT,
  nb_rge_pac SMALLINT,

  -- Sit@del2 (12 derniers mois agrégés permis logements existants)
  nb_dp_logements_existants_12m INT,

  -- Météo-France DJU
  station_dju_id TEXT,                 -- ex: 'BREST-GUIPAVAS'
  dju_18_normal NUMERIC(6,1),          -- DJU 18 °C base normales 1991-2020 (vs 2424 théorique H2a)

  -- DRIAS Climat 2050 (delta DJU futur)
  delta_dju_2050 NUMERIC(5,2),

  -- Méta
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brh_ext_commune_opah ON brh_ext_commune(opah_active) WHERE opah_active = true;
CREATE INDEX brh_ext_commune_radon ON brh_ext_commune(radon_categorie) WHERE radon_categorie = 3;

COMMENT ON TABLE brh_ext_commune IS
  'Données commune-level Bretagne (Géorisques + ANAH + LOVAC + RGE + Sit@del2 + Météo-France). Fallback rural quand IRIS non exploitable.';

-- ============================================================================
-- 4. ALTER brh_dpe_prospects — colonnes scoring v2
-- ============================================================================
ALTER TABLE brh_dpe_prospects
  ADD COLUMN iris_code CHAR(9),                       -- jointure brh_ext_iris
  ADD COLUMN score_v2 SMALLINT CHECK (score_v2 BETWEEN 0 AND 100),
  ADD COLUMN score_v2_segment TEXT CHECK (score_v2_segment IN ('ultra_chaud', 'mpr_bleu_prio', 'premium', 'standard', 'cold')),
  ADD COLUMN score_v2_detail JSONB,                   -- breakdown { rules: [{rule, points, trigger}] }
  ADD COLUMN score_v2_calculated_at TIMESTAMPTZ,
  ADD COLUMN enedis_kwh_logt NUMERIC(8,1),            -- conso annuelle Enedis adresse (si dispo, ≥10 PDL)
  ADD COLUMN dvf_mutation_24m BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN has_pv_36kw BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN abf_required BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX brh_dpe_prospects_score_v2 ON brh_dpe_prospects(score_v2 DESC) WHERE score_v2 IS NOT NULL;
CREATE INDEX brh_dpe_prospects_iris ON brh_dpe_prospects(iris_code) WHERE iris_code IS NOT NULL;
CREATE INDEX brh_dpe_prospects_segment ON brh_dpe_prospects(score_v2_segment) WHERE score_v2_segment IS NOT NULL;

COMMENT ON COLUMN brh_dpe_prospects.score_v2 IS
  'Score composite v2 (0-100) — orchestré par src/lib/dpe-engine/external/score-v2.ts. Voir wiki external-data-sources.md.';

-- ============================================================================
-- RLS — pro+admin uniquement (anon utilise dpe-express-lookup côté simulateur)
-- ============================================================================
ALTER TABLE brh_ext_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_ext_iris ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_ext_commune ENABLE ROW LEVEL SECURITY;

-- brh_ext_cache : service_role uniquement (manipulé via EF)
CREATE POLICY "service_only_cache_select" ON brh_ext_cache FOR SELECT
  TO service_role USING (true);
CREATE POLICY "service_only_cache_write" ON brh_ext_cache FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- brh_ext_iris : lecture pro+admin
CREATE POLICY "pro_select_iris" ON brh_ext_iris FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('pro', 'admin')
    )
  );

-- brh_ext_commune : lecture pro+admin
CREATE POLICY "pro_select_commune" ON brh_ext_commune FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('pro', 'admin')
    )
  );

-- Écriture admin uniquement (les EF utilisent service_role qui bypass RLS)
CREATE POLICY "admin_write_iris" ON brh_ext_iris FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin_write_commune" ON brh_ext_commune FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Helper function : décile MPR auto depuis revenu UC (barème national 2024-2026)
-- ============================================================================
-- Source : MaPrimeRénov' grille 2024 — RFR par UC, ajustements 2025/2026
-- Mappage approximatif via revenu disponible UC (Filosofi MED21)
CREATE OR REPLACE FUNCTION brh_ext_decile_to_couleur_mpr(decile SMALLINT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN decile BETWEEN 1 AND 3 THEN 'bleu'      -- très modeste
    WHEN decile BETWEEN 4 AND 5 THEN 'jaune'     -- modeste
    WHEN decile BETWEEN 6 AND 8 THEN 'violet'    -- intermédiaire
    WHEN decile BETWEEN 9 AND 10 THEN 'rose'     -- supérieur
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION brh_ext_decile_to_couleur_mpr IS
  'Mapping décile INSEE → couleur MaPrimeRénov''. Utilisé par seed-iris-bretagne.ts.';
