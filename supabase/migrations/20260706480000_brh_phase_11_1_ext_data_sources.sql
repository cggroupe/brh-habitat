-- Phase 11.1 — Tier 1 sources externes scoring (08/05/2026)
--
-- Implémente le socle technique pour ingérer les sources publiques gratuites
-- listées dans docs/wiki/external-data-sources.md (89 sources identifiées).
--
-- Approche progressive : on crée d'abord les tables cache + RGE
-- (la source la plus simple à charger via API ADEME data-fair).
-- Filosofi 2021 IRIS, Enedis et GRDF seront ajoutées au fur et à mesure
-- (API actuellement en HTTP 500 chez INSEE le 08/05).

-- 1) Cache générique pour responses APIs externes (TTL configurable)
CREATE TABLE IF NOT EXISTS brh_ext_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                    -- ex: 'georisques', 'enedis_iris', 'grdf_dept'
  cache_key TEXT NOT NULL,                 -- ex: 'INSEE-29019' ou 'IRIS-292320101'
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 7776000,  -- 90j
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, cache_key)
);

CREATE INDEX IF NOT EXISTS brh_ext_cache_source_key
  ON brh_ext_cache (source, cache_key);

CREATE INDEX IF NOT EXISTS brh_ext_cache_fetched_at
  ON brh_ext_cache (fetched_at DESC);

-- 2) Entreprises RGE (Reconnu Garant Environnement) — concurrence locale artisans
-- Source : https://data.ademe.fr/data-fair/api/v1/datasets/eo1n335dwa-ul7glxa7lm1ho
-- 164 766 entreprises FR mises à jour quotidiennement par ADEME.
CREATE TABLE IF NOT EXISTS brh_ext_rge_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siret CHAR(14) NOT NULL,
  nom_entreprise TEXT NOT NULL,
  adresse TEXT,
  code_postal CHAR(5),
  commune TEXT,
  code_insee_commune CHAR(5),              -- enrichi via geo.api.gouv.fr
  departement CHAR(2),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  telephone TEXT,
  email TEXT,
  site_internet TEXT,
  -- Qualifications RGE (1 SIRET peut avoir plusieurs qualifs)
  code_qualification TEXT,
  nom_qualification TEXT,
  url_qualification TEXT,
  nom_certificat TEXT,
  domaine TEXT,                            -- ex: "Etude thermique reglementaire"
  source_data TEXT NOT NULL DEFAULT 'ademe-data-fair',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Une qualif peut être unique (siret + code_qualification)
  UNIQUE(siret, code_qualification)
);

CREATE INDEX IF NOT EXISTS brh_ext_rge_dept
  ON brh_ext_rge_companies (departement);

CREATE INDEX IF NOT EXISTS brh_ext_rge_commune
  ON brh_ext_rge_companies (commune)
  WHERE commune IS NOT NULL;

CREATE INDEX IF NOT EXISTS brh_ext_rge_siret
  ON brh_ext_rge_companies (siret);

CREATE INDEX IF NOT EXISTS brh_ext_rge_geo
  ON brh_ext_rge_companies (lat, lng)
  WHERE lat IS NOT NULL;

-- 3) Stats RGE par commune (vue matérialisée pour score concurrence local)
CREATE MATERIALIZED VIEW IF NOT EXISTS brh_ext_rge_stats_commune AS
SELECT
  code_insee_commune,
  commune,
  departement,
  count(DISTINCT siret) as nb_entreprises_rge,
  count(*) as nb_qualifications,
  array_agg(DISTINCT domaine) FILTER (WHERE domaine IS NOT NULL) as domaines
FROM brh_ext_rge_companies
WHERE code_insee_commune IS NOT NULL
GROUP BY code_insee_commune, commune, departement;

CREATE UNIQUE INDEX IF NOT EXISTS brh_ext_rge_stats_commune_pk
  ON brh_ext_rge_stats_commune (code_insee_commune);

-- 4) RLS — lecture publique authentifiée (data publiques par nature)
ALTER TABLE brh_ext_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_ext_rge_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ext_cache_authenticated_read ON brh_ext_cache;
CREATE POLICY ext_cache_authenticated_read ON brh_ext_cache
  FOR SELECT TO authenticated USING (TRUE);
  -- exception documentée : cache public APIs gouv (données publiques par nature)

DROP POLICY IF EXISTS ext_cache_admin_all ON brh_ext_cache;
CREATE POLICY ext_cache_admin_all ON brh_ext_cache
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS ext_rge_authenticated_read ON brh_ext_rge_companies;
CREATE POLICY ext_rge_authenticated_read ON brh_ext_rge_companies
  FOR SELECT TO authenticated USING (TRUE);
  -- exception documentée : RGE ADEME (données publiques)

DROP POLICY IF EXISTS ext_rge_admin_all ON brh_ext_rge_companies;
CREATE POLICY ext_rge_admin_all ON brh_ext_rge_companies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMENT ON TABLE brh_ext_cache IS 'Cache générique APIs externes (Géorisques, Enedis, GRDF, etc.) - TTL configurable';
COMMENT ON TABLE brh_ext_rge_companies IS 'Entreprises RGE (ADEME) - concurrence locale artisans, refresh hebdo';
