-- Migration : brh_dpe_prospects (Phase 6.2)
-- Source : table 'dpe_prospects' PostgreSQL local (59 306 Bretagne F/G + Kelvin-parity)
-- Date : 2026-05-01
--
-- Strategie ADR-010 : centraliser tout dans Supabase pour permettre sunset
-- du PostgreSQL local + simulateur FastAPI port 8915 (Phase 6.3).
--
-- RLS : pros + admin uniquement (les anonymes utilisent /diagnostic-express
-- qui passe par EF dpe-express-lookup → simulateur 8915 pour la BDNB).

CREATE TABLE brh_dpe_prospects (
  id SERIAL PRIMARY KEY,
  numero_dpe VARCHAR(50) UNIQUE,

  -- DPE de base
  date_dpe DATE,
  etiquette_dpe CHAR(1) CHECK (etiquette_dpe IS NULL OR etiquette_dpe IN ('A','B','C','D','E','F','G')),
  etiquette_ges CHAR(1) CHECK (etiquette_ges IS NULL OR etiquette_ges IN ('A','B','C','D','E','F','G')),

  -- Adresse / géo
  adresse TEXT,
  adresse_ban TEXT,
  code_postal VARCHAR(10),
  commune VARCHAR(100),
  departement VARCHAR(3),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Bâtiment
  type_batiment VARCHAR(50),
  periode_construction VARCHAR(50),
  annee_construction INT,
  surface_habitable DOUBLE PRECISION,
  hauteur_sous_plafond DOUBLE PRECISION,
  nombre_niveau INT,

  -- Conso & coûts
  conso_m2_ep DOUBLE PRECISION,
  cout_energie_annuel DOUBLE PRECISION,
  cout_chauffage DOUBLE PRECISION,
  cout_ecs DOUBLE PRECISION,
  cout_eclairage DOUBLE PRECISION,

  -- Énergie
  energie_chauffage VARCHAR(100),
  description_chauffage TEXT,
  type_energie_chauffage TEXT,
  energie_ecs VARCHAR(100),
  description_ecs TEXT,
  type_energie_ecs TEXT,
  type_ventilation TEXT,

  -- Isolation
  isolation_enveloppe VARCHAR(50),
  isolation_menuiseries VARCHAR(50),
  isolation_murs VARCHAR(50),
  isolation_plancher VARCHAR(50),
  isolation_toiture_detail TEXT,
  qualite_isolation_murs TEXT,
  qualite_isolation_menuiseries TEXT,
  qualite_isolation_plancher_bas TEXT,
  qualite_isolation_plancher_haut TEXT,

  -- Performances
  ubat DOUBLE PRECISION,
  deperditions_murs DOUBLE PRECISION,
  deperditions_baies_vitrees DOUBLE PRECISION,
  deperditions_planchers_bas DOUBLE PRECISION,
  deperditions_planchers_hauts DOUBLE PRECISION,
  deperditions_ponts_thermiques DOUBLE PRECISION,

  -- Scoring & statut
  score_prospect INT DEFAULT 0,
  statut VARCHAR(20) DEFAULT 'nouveau',
  date_collecte TIMESTAMPTZ DEFAULT now(),
  date_contact TIMESTAMPTZ,
  enriched BOOLEAN DEFAULT false,
  notes TEXT,

  -- Propriétaire DGFIP (open data SCI/SARL)
  owner_name TEXT,
  owner_siren TEXT,
  owner_type TEXT,

  -- DVF (valeurs foncières)
  dvf_prix INT,
  dvf_date TEXT,
  dvf_type TEXT,
  dvf_surface REAL,
  dvf_prix_m2 INT,
  dvf_distance_m INT,
  dvf_nature TEXT,

  -- RNB (Référentiel National des Bâtiments)
  rnb_id TEXT,
  rnb_status TEXT,
  rnb_distance_m REAL,
  rnb_address TEXT,

  -- Aides Kelvin-parity (29/04)
  mpr_bleu_total NUMERIC(10,2),
  mpr_jaune_total NUMERIC(10,2),
  mpr_violet_total NUMERIC(10,2),
  mpr_rose_total NUMERIC(10,2),
  cee_total NUMERIC(10,2),
  aides_detail JSONB,
  aides_barem_date DATE,

  -- Chiffrage Kelvin-parity (Batichiffrage)
  chiffrage_detail JSONB,
  chiffrage_total_ht NUMERIC(10,2),
  chiffrage_total_ttc NUMERIC(10,2),
  chiffrage_date TIMESTAMPTZ,

  -- Saut DPE projeté (3CL simplifié)
  dpe_saut_s1 JSONB,
  dpe_saut_s2 JSONB,
  dpe_saut_s3 JSONB,
  dpe_saut_confidence VARCHAR(8),

  -- BRH metadata
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  brh_prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL  -- lien après conversion
);

-- Indexes (cf source PostgreSQL local)
CREATE INDEX idx_brh_dpe_prospects_etiquette ON brh_dpe_prospects(etiquette_dpe);
CREATE INDEX idx_brh_dpe_prospects_dept ON brh_dpe_prospects(departement);
CREATE INDEX idx_brh_dpe_prospects_commune ON brh_dpe_prospects(commune);
CREATE INDEX idx_brh_dpe_prospects_type ON brh_dpe_prospects(type_batiment);
CREATE INDEX idx_brh_dpe_prospects_score ON brh_dpe_prospects(score_prospect DESC);
CREATE INDEX idx_brh_dpe_prospects_statut ON brh_dpe_prospects(statut);
CREATE INDEX idx_brh_dpe_prospects_geo ON brh_dpe_prospects(latitude, longitude);
CREATE INDEX idx_brh_dpe_prospects_chiffrage_date ON brh_dpe_prospects(chiffrage_date);
CREATE INDEX idx_brh_dpe_prospects_aides_barem ON brh_dpe_prospects(aides_barem_date);
CREATE INDEX idx_brh_dpe_prospects_saut_s2 ON brh_dpe_prospects USING gin(dpe_saut_s2);
CREATE INDEX idx_brh_dpe_prospects_brh_prospect ON brh_dpe_prospects(brh_prospect_id);

-- RLS : pros + admin only (anonymes passent par EF dpe-express-lookup → simulateur 8915)
ALTER TABLE brh_dpe_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_select_dpe_prospects" ON brh_dpe_prospects FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('pro', 'admin'))
  );

CREATE POLICY "admin_write_dpe_prospects" ON brh_dpe_prospects FOR ALL
  USING (
    EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

COMMENT ON TABLE brh_dpe_prospects IS
  'DPE F/G Bretagne (59k rows) avec enrichissement Kelvin-parity (aides MPR 4 déciles + chiffrage Batichiffrage + saut DPE 3CL projeté). Source : ADEME + DGFIP + DVF + RNB.';
