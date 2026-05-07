-- =============================================================================
-- Phase 19 Sprint E — BODACC tertiaire + permis Sit@del2
-- =============================================================================
--
-- 2 nouvelles tables :
--   1. brh_bodacc_alerts          — alertes BODACC (ventes commerciales + procédures
--                                   collectives + radiations RCS)
--   2. brh_permis_construire      — permis de construire/démolir/aménager (Sit@del2)
--
-- Conformité 14 règles :
--   #5  COMMIT à la fin
--   #11 TIMESTAMPTZ partout
--   #12 SET search_path = '' sur SECURITY DEFINER
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_bodacc_alerts — ventes / liquidations / radiations BODACC
-- ----------------------------------------------------------------------------
-- Source : bodacc-datadila.opendatasoft.com (dataset annonces-* officiel BODACC)
-- 3 familles d'avis :
--   - 'commerciales' (vente fonds, cession locaux, mutation pro)
--   - 'collectives' (liquidation judiciaire, redressement, procédure de sauvegarde)
--   - 'radiations'  (radiation RCS = entreprise disparue)
--
-- Une alerte BODACC = 1 row. Cache à la demande par commune ou département.
CREATE TABLE IF NOT EXISTS brh_bodacc_alerts (
  -- Identifiant unique BODACC
  id_bodacc TEXT PRIMARY KEY,

  -- Famille + type d'avis
  famille_avis TEXT NOT NULL
    CHECK (famille_avis IN ('commerciales','collectives','radiations','autres')),
  type_avis TEXT,                          -- libellé précis (ex: "Vente de fonds de commerce")

  -- Date de publication + parution
  date_publication DATE NOT NULL,
  date_parution DATE,
  numero_parution TEXT,

  -- Entité concernée
  siren CHAR(9),
  denomination TEXT,
  forme_juridique TEXT,

  -- Localisation siège
  commune TEXT,
  code_postal CHAR(5),
  departement CHAR(2),
  code_insee_commune CHAR(5),
  adresse_complete TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Détails financiers (pour les ventes commerciales)
  prix_cession_cents BIGINT,               -- prix de la cession HT en cents
  date_cession DATE,

  -- URL annonce officielle (lien BODACC)
  bodacc_url TEXT,

  -- Snapshot complet pour audit
  raw_record JSONB,

  -- Métadonnées
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_bodacc_alerts_dept
  ON brh_bodacc_alerts(departement);
CREATE INDEX IF NOT EXISTS brh_bodacc_alerts_commune
  ON brh_bodacc_alerts(code_insee_commune) WHERE code_insee_commune IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_bodacc_alerts_famille
  ON brh_bodacc_alerts(famille_avis, date_publication DESC);
CREATE INDEX IF NOT EXISTS brh_bodacc_alerts_siren
  ON brh_bodacc_alerts(siren) WHERE siren IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_bodacc_alerts_recent
  ON brh_bodacc_alerts(date_publication DESC);

COMMENT ON TABLE brh_bodacc_alerts IS
  'Phase 19 Sprint E — alertes BODACC (ventes commerciales + procédures collectives + radiations RCS) pour le tertiaire. Source bodacc-datadila.opendatasoft.com. PK = id_bodacc.';

-- ----------------------------------------------------------------------------
-- 2. brh_permis_construire — permis Sit@del2 (data.gouv mensuel)
-- ----------------------------------------------------------------------------
-- Source : data.gouv.fr Sit@del2 (CSV mensuel + API search dataset)
-- Types : PC (permis construire), PA (aménager), PD (démolir), DP (déclaration préalable)
CREATE TABLE IF NOT EXISTS brh_permis_construire (
  -- ID Sit@del2 (numéro permis officiel : ex "PC035099 24 H0001")
  id_permis TEXT PRIMARY KEY,

  type_permis TEXT NOT NULL
    CHECK (type_permis IN ('PC','PA','PD','DP','DPMI','DPLT','autre')),
    -- PC=Permis Construire, PA=Aménager, PD=Démolir, DP=Déclaration Préalable

  -- Demandeur
  demandeur_nom TEXT,
  demandeur_qualite TEXT,                  -- 'particulier' | 'sci' | 'entreprise' | 'agriculteur' | 'collectivite'

  -- Localisation
  adresse_complete TEXT,
  commune TEXT,
  code_postal CHAR(5),
  departement CHAR(2),
  code_insee_commune CHAR(5),
  parcelle_idu CHAR(14),                   -- soft FK vers brh_parcelles_cache
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Caractéristiques projet
  surface_terrain_m2 INTEGER,
  surface_plancher_m2 INTEGER,
  destination TEXT,                        -- 'habitation' | 'commerce' | 'bureaux' | 'industriel' | 'mixte'
  nature_travaux TEXT,                     -- libellé descriptif ('Construction maison individuelle', etc.)
  nombre_logements_crees INTEGER,

  -- Workflow administratif
  date_depot DATE NOT NULL,
  date_decision DATE,
  decision TEXT
    CHECK (decision IS NULL OR decision IN ('accorde','refuse','tacite','retire','prorroge','annule')),
  date_dob TEXT,                           -- date d'ouverture des travaux (DOC) — TEXT car format variable
  date_daact TEXT,                         -- date d'achèvement (DAACT)

  -- Validité (calculée)
  -- PC = 3 ans + 2 prorogations 1 an → max 5 ans
  date_validite_max DATE,                  -- = date_decision + 5 ans pour PC accordé

  -- Source millésime
  source_year INTEGER NOT NULL,
  source_month INTEGER NOT NULL CHECK (source_month BETWEEN 1 AND 12),

  raw_record JSONB,

  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_permis_dept_year
  ON brh_permis_construire(departement, source_year DESC);
CREATE INDEX IF NOT EXISTS brh_permis_commune
  ON brh_permis_construire(code_insee_commune) WHERE code_insee_commune IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_permis_parcelle
  ON brh_permis_construire(parcelle_idu) WHERE parcelle_idu IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_permis_recent
  ON brh_permis_construire(date_depot DESC);
CREATE INDEX IF NOT EXISTS brh_permis_decision
  ON brh_permis_construire(decision) WHERE decision IS NOT NULL;

COMMENT ON TABLE brh_permis_construire IS
  'Phase 19 Sprint E — permis Sit@del2 (PC/PA/PD/DP). Source data.gouv.fr millésime mensuel. Validité PC = 3 ans + 2 prorogations.';

-- ----------------------------------------------------------------------------
-- 3. RLS — lecture pour pro authentifié, écriture service_role/admin
-- ----------------------------------------------------------------------------
ALTER TABLE brh_bodacc_alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_permis_construire      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bodacc_alerts_authenticated_select ON brh_bodacc_alerts;
CREATE POLICY bodacc_alerts_authenticated_select ON brh_bodacc_alerts
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : BODACC = bulletin officiel public

DROP POLICY IF EXISTS bodacc_alerts_admin_all ON brh_bodacc_alerts;
CREATE POLICY bodacc_alerts_admin_all ON brh_bodacc_alerts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS permis_authenticated_select ON brh_permis_construire;
CREATE POLICY permis_authenticated_select ON brh_permis_construire
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : Sit@del2 = open data

DROP POLICY IF EXISTS permis_admin_all ON brh_permis_construire;
CREATE POLICY permis_admin_all ON brh_permis_construire
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;

-- =============================================================================
-- Vérification
-- =============================================================================
SELECT 'bodacc_alerts' AS table_name, count(*) AS rows FROM brh_bodacc_alerts
UNION ALL SELECT 'permis_construire', count(*) FROM brh_permis_construire;
