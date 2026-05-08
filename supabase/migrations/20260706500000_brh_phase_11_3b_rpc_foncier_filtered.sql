-- Phase 11.3b — RPC foncier prospects filtered + colonnes brh_ext_commune

-- Colonnes brh_ext_commune ajoutées (idempotent)
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS dpe_tertiaire_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS merimee_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS merimee_classe INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS merimee_inscrit INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS natura2000_sic_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS natura2000_zps_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS natura2000_sample TEXT;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS rnb_batiments_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS lovac_pp_total_2024 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS lovac_pp_vacant_2024 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS lovac_pp_vacant_2ans_2024 INTEGER;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS lovac_tx_vacance NUMERIC(5,4);
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS lovac_tx_vacance_long NUMERIC(5,4);
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS tlv_zonage TEXT;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS tlv_tendue BOOLEAN;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS audits_ademe_count INTEGER DEFAULT 0;
ALTER TABLE brh_ext_commune ADD COLUMN IF NOT EXISTS tracc_climat JSONB;

-- Colonnes brh_ext_iris (Recensement 2021)
ALTER TABLE brh_ext_iris ADD COLUMN IF NOT EXISTS tx_maison NUMERIC(4,3);
ALTER TABLE brh_ext_iris ADD COLUMN IF NOT EXISTS tx_vacance_log NUMERIC(4,3);
ALTER TABLE brh_ext_iris ADD COLUMN IF NOT EXISTS p21_log INTEGER;
ALTER TABLE brh_ext_iris ADD COLUMN IF NOT EXISTS p21_rp INTEGER;
ALTER TABLE brh_ext_iris ADD COLUMN IF NOT EXISTS reco_fetched_at TIMESTAMPTZ;

-- Table brh_ext_immo_companies (Phase 11.2)
CREATE TABLE IF NOT EXISTS brh_ext_immo_companies (
  siren CHAR(9) PRIMARY KEY,
  siret_siege CHAR(14),
  nom_complet TEXT,
  forme_juridique TEXT,
  activite_principale CHAR(6),
  type_immo TEXT,
  date_creation DATE,
  tranche_effectifs SMALLINT,
  commune TEXT,
  code_postal TEXT,
  code_insee_commune CHAR(5),
  departement CHAR(2),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  raw_data JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS brh_ext_immo_dept ON brh_ext_immo_companies (departement);
CREATE INDEX IF NOT EXISTS brh_ext_immo_naf ON brh_ext_immo_companies (activite_principale);
ALTER TABLE brh_ext_immo_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ext_immo_authenticated_read ON brh_ext_immo_companies;
CREATE POLICY ext_immo_authenticated_read ON brh_ext_immo_companies FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS ext_immo_admin_all ON brh_ext_immo_companies;
CREATE POLICY ext_immo_admin_all ON brh_ext_immo_companies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Table brh_ext_outils_communaux (Phase 11.3 — cadastres solaires)
CREATE TABLE IF NOT EXISTS brh_ext_outils_communaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_outil TEXT NOT NULL,
  code_epci TEXT,
  code_insee CHAR(5),
  nom_collectivite TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT,
  description TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type_outil, code_epci, code_insee)
);
ALTER TABLE brh_ext_outils_communaux ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ext_outils_authenticated_read ON brh_ext_outils_communaux;
CREATE POLICY ext_outils_authenticated_read ON brh_ext_outils_communaux FOR SELECT TO authenticated USING (TRUE);
DROP POLICY IF EXISTS ext_outils_admin_all ON brh_ext_outils_communaux;
CREATE POLICY ext_outils_admin_all ON brh_ext_outils_communaux FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- RPC brh_foncier_prospects_filtered (Phase 11.3b — filtres avancés carte)
CREATE OR REPLACE FUNCTION brh_foncier_prospects_filtered(
  p_min_lat double precision,
  p_max_lat double precision,
  p_min_lng double precision,
  p_max_lng double precision,
  p_ratings char[] DEFAULT ARRAY['F','G']::char[],
  p_score_v2_min smallint DEFAULT 0,
  p_segment_v2 text DEFAULT NULL,
  p_opah_only boolean DEFAULT FALSE,
  p_rga_fort_only boolean DEFAULT FALSE,
  p_tlv_tendue_only boolean DEFAULT FALSE,
  p_audits_dyna_only boolean DEFAULT FALSE,
  p_dept text DEFAULT NULL,
  p_limit int DEFAULT 500
)
RETURNS TABLE (
  id integer, lat double precision, lng double precision,
  dpe_rating char, adresse text, commune varchar,
  surface double precision, code_insee_commune text,
  score_v2 smallint, score_v2_segment text, iris_code char,
  opah_active boolean, rga_alea text, tlv_tendue boolean,
  audits_ademe_count integer, delta_dju_2050 numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    p.id, p.latitude, p.longitude,
    p.etiquette_dpe, p.adresse, p.commune,
    p.surface_habitable, substr(p.iris_code, 1, 5),
    p.score_v2, p.score_v2_segment, p.iris_code,
    c.opah_active, c.rga_alea, c.tlv_tendue,
    c.audits_ademe_count, c.delta_dju_2050
  FROM public.brh_dpe_prospects p
  LEFT JOIN public.brh_ext_commune c ON c.insee::text = substr(p.iris_code, 1, 5)
  WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND p.etiquette_dpe IS NOT NULL
    AND p.etiquette_dpe = ANY(p_ratings)
    AND p.latitude BETWEEN p_min_lat AND p_max_lat
    AND p.longitude BETWEEN p_min_lng AND p_max_lng
    AND (p_dept IS NULL OR p.departement = p_dept)
    AND (p_score_v2_min = 0 OR p.score_v2 >= p_score_v2_min)
    AND (p_segment_v2 IS NULL OR p.score_v2_segment = p_segment_v2)
    AND (NOT p_opah_only OR c.opah_active = TRUE)
    AND (NOT p_rga_fort_only OR c.rga_alea = 'fort')
    AND (NOT p_tlv_tendue_only OR c.tlv_tendue = TRUE)
    AND (NOT p_audits_dyna_only OR c.audits_ademe_count > 100)
  ORDER BY p.score_v2 DESC NULLS LAST
  LIMIT LEAST(p_limit, 2000);
$$;
GRANT EXECUTE ON FUNCTION brh_foncier_prospects_filtered TO authenticated;
COMMENT ON FUNCTION brh_foncier_prospects_filtered IS 'Phase 11.3b — Prospects DPE F/G filtrés par flags commune (OPAH/RGA/TLV/audits)';
