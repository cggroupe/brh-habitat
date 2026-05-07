-- =============================================================================
-- Phase 19 Sprint B — SCI enrichi : dirigeants + matching décès INSEE
-- =============================================================================
--
-- Source data : recherche-entreprises.api.gouv.fr (DataInfogreffe gratuit)
--               + api.deces.matchid.io (matching décès INSEE gratuit)
--
-- 2 nouvelles tables :
--   1. brh_sci_companies      — cache SCI (PM) avec dirigeants en JSONB (TTL 30j)
--   2. brh_sci_deces_matches  — historique des matchs décès (audit + score confiance)
--
-- Conformité 14 règles anti-bug :
--   #5  COMMIT à la fin (transactionnel)
--   #8  pas de USING (true) sauf cache public documenté
--   #11 TIMESTAMPTZ partout
--   #12 SET search_path = '' sur fonctions SECURITY DEFINER
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_sci_companies — cache SCI fetched depuis recherche-entreprises
-- ----------------------------------------------------------------------------
-- Une SCI est identifiée par son SIREN (9 chars). On cache les méta-données
-- + les dirigeants en JSONB pour éviter de bombarder l'API gouv.
--
-- TTL 30 jours (les dirigeants changent rarement, et on rafraîchit à la demande).
CREATE TABLE IF NOT EXISTS brh_sci_companies (
  siren CHAR(9) PRIMARY KEY,

  -- Métadonnées entreprise
  denomination TEXT NOT NULL,
  forme_juridique TEXT,                -- "SCI", "SARL", etc. — on filtre SCI mais on garde le champ générique
  date_creation DATE,
  date_radiation DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Localisation siège
  adresse_complete TEXT,
  code_postal CHAR(5),
  commune TEXT,
  departement CHAR(2),
  code_insee_commune CHAR(5),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Activité
  activite_principale TEXT,            -- code NAF
  activite_libelle TEXT,
  capital_social_cents BIGINT,         -- INTEGER cents (règle anti-bug #2)
  effectif TEXT,

  -- Dirigeants en JSONB (array d'objets)
  -- Format : [{ nom, prenom, qualite, date_naissance, est_decede?, deces_match_score? }]
  dirigeants JSONB NOT NULL DEFAULT '[]',

  -- Flags calculés (mis à jour par EF sci-deces-match)
  has_deceased_dirigeant BOOLEAN NOT NULL DEFAULT FALSE,
  succession_probable_score SMALLINT NOT NULL DEFAULT 0,
    -- 0 (aucun décès) → 50 (≥1 décès parmi plusieurs) → 100 (tous décédés ou unique décédé)

  -- Métadonnées brutes API
  raw_response JSONB,

  -- Cache TTL 30 jours
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 2592000, -- 30 jours

  -- Dernière vérification décès
  deces_last_checked_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_sci_companies_dept
  ON brh_sci_companies(departement) WHERE departement IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_sci_companies_commune
  ON brh_sci_companies(code_insee_commune) WHERE code_insee_commune IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_sci_companies_succession
  ON brh_sci_companies(succession_probable_score DESC) WHERE succession_probable_score > 0;
CREATE INDEX IF NOT EXISTS brh_sci_companies_forme
  ON brh_sci_companies(forme_juridique) WHERE forme_juridique IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_sci_companies_active
  ON brh_sci_companies(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS brh_sci_companies_geo
  ON brh_sci_companies(lat, lng) WHERE lat IS NOT NULL;

-- Recherche full-text basique sur denomination
CREATE INDEX IF NOT EXISTS brh_sci_companies_denomination_trgm
  ON brh_sci_companies USING GIN (denomination gin_trgm_ops);

-- Note : extension pg_trgm peut nécessiter activation préalable.
-- Si non disponible, retomber sur ILIKE (déjà géré par planner).

COMMENT ON TABLE brh_sci_companies IS
  'Phase 19 Sprint B — cache SCI/PM (recherche-entreprises.api.gouv.fr). PK = siren. Dirigeants en JSONB. TTL 30j.';

COMMENT ON COLUMN brh_sci_companies.dirigeants IS
  'Format JSONB array : [{ nom, prenom, qualite, date_naissance, est_decede, deces_match_score }]. Mis à jour par EF sci-search puis sci-deces-match.';

COMMENT ON COLUMN brh_sci_companies.succession_probable_score IS
  'Score 0-100 : 0=aucun décès, 50=≥1 décès parmi plusieurs dirigeants, 100=unique dirigeant décédé OU tous décédés.';

-- ----------------------------------------------------------------------------
-- 2. brh_sci_deces_matches — historique audits matching décès INSEE
-- ----------------------------------------------------------------------------
-- Permet de tracer chaque match (et non-match) avec score de confiance,
-- pour audit RGPD + tuning de l'algo de matching.
CREATE TABLE IF NOT EXISTS brh_sci_deces_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  siren CHAR(9) NOT NULL REFERENCES brh_sci_companies(siren) ON DELETE CASCADE,
  dirigeant_index SMALLINT NOT NULL,   -- index 0..N dans le JSONB dirigeants

  -- Données du dirigeant matchées (snapshot)
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance DATE,                 -- peut être partielle (jour 01 si seulement année connue)

  -- Résultat matching
  match_found BOOLEAN NOT NULL,
  match_confidence SMALLINT NOT NULL DEFAULT 0,  -- 0-100
    -- 100 = nom+prénom+dob exacts
    -- 70-90 = nom+prénom exacts + dob ±1 mois
    -- 50-70 = nom+prénom exacts + année dob seulement
    -- <50 = matching faible (ne devrait pas trigger flag décès)

  -- Données du décès trouvé (si match)
  deces_date DATE,
  deces_commune TEXT,
  deces_departement CHAR(2),

  -- Source du matching
  source TEXT NOT NULL DEFAULT 'matchid.io'
    CHECK (source IN ('matchid.io','insee_csv','manual')),

  -- Raw response pour audit
  raw_response JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_sci_deces_siren
  ON brh_sci_deces_matches(siren);
CREATE INDEX IF NOT EXISTS brh_sci_deces_match_found
  ON brh_sci_deces_matches(match_found) WHERE match_found = TRUE;

COMMENT ON TABLE brh_sci_deces_matches IS
  'Phase 19 Sprint B — audit trail matching décès INSEE pour les dirigeants des SCI cachées. Score confiance 0-100. Source matchid.io ou insee_csv ou manual.';

-- ----------------------------------------------------------------------------
-- 3. Trigger updated_at sur brh_sci_companies
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_brh_sci_companies_updated ON brh_sci_companies;
CREATE TRIGGER trg_brh_sci_companies_updated
  BEFORE UPDATE ON brh_sci_companies
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Helper SECURITY DEFINER : recompute succession_probable_score
-- ----------------------------------------------------------------------------
-- Re-calcule le score à partir des dirigeants JSONB après matching décès.
CREATE OR REPLACE FUNCTION public.brh_sci_recompute_succession_score(p_siren CHAR(9))
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_dirigeants INT;
  v_decedes INT;
  v_score SMALLINT;
BEGIN
  SELECT
    coalesce(jsonb_array_length(dirigeants), 0),
    coalesce(
      (SELECT count(*) FROM jsonb_array_elements(dirigeants) AS d
       WHERE (d->>'est_decede')::boolean = TRUE),
      0
    )
  INTO v_total_dirigeants, v_decedes
  FROM public.brh_sci_companies
  WHERE siren = p_siren;

  v_score := CASE
    WHEN v_total_dirigeants = 0 THEN 0
    WHEN v_decedes = 0 THEN 0
    WHEN v_decedes = v_total_dirigeants THEN 100
    WHEN v_total_dirigeants = 1 AND v_decedes = 1 THEN 100
    ELSE 50
  END;

  UPDATE public.brh_sci_companies
  SET
    has_deceased_dirigeant = (v_decedes > 0),
    succession_probable_score = v_score,
    deces_last_checked_at = now()
  WHERE siren = p_siren;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_sci_recompute_succession_score(CHAR) TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_sci_recompute_succession_score(CHAR) IS
  'Phase 19 Sprint B — recalcule le score succession_probable d''une SCI à partir de ses dirigeants JSONB.';

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE brh_sci_companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_sci_deces_matches    ENABLE ROW LEVEL SECURITY;

-- ----- brh_sci_companies (lecture pour tout pro authentifié, write service_role)
DROP POLICY IF EXISTS sci_companies_authenticated_select ON brh_sci_companies;
CREATE POLICY sci_companies_authenticated_select ON brh_sci_companies
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : cache public DataInfogreffe (données déjà publiques par nature)

DROP POLICY IF EXISTS sci_companies_admin_all ON brh_sci_companies;
CREATE POLICY sci_companies_admin_all ON brh_sci_companies
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- brh_sci_deces_matches (lecture admin uniquement — RGPD audit trail)
DROP POLICY IF EXISTS sci_deces_admin_all ON brh_sci_deces_matches;
CREATE POLICY sci_deces_admin_all ON brh_sci_deces_matches
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Les pros agence VOIENT le score succession via brh_sci_companies, mais pas le détail
-- du matching (RGPD : décès est une info sensible même si publique). L'audit trail reste admin.

COMMIT;

-- =============================================================================
-- Vérification post-migration
-- =============================================================================
SELECT 'sci_companies' AS table_name, count(*) AS rows FROM brh_sci_companies
UNION ALL SELECT 'sci_deces_matches', count(*) FROM brh_sci_deces_matches;
