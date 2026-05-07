-- =============================================================================
-- Phase 19 Sprint C — DVF archive + sociodémo communes
-- =============================================================================
--
-- Objectif :
--   - Archive long-terme DVF (anti-suppression officielle 4-5 ans)
--   - Cache sociodémo par commune INSEE (loyers + élus + élections + Filosofi)
--
-- 2 nouvelles tables :
--   1. brh_dvf_archive          — snapshot historique mutations DVF par parcelle
--   2. brh_communes_sociodemo   — cache enrichi par INSEE commune (TTL 90j)
--
-- Conformité 14 règles :
--   #2  BIGINT cents pour montants DVF + loyers
--   #5  COMMIT à la fin
--   #11 TIMESTAMPTZ partout
--   #12 SET search_path = '' sur SECURITY DEFINER
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_dvf_archive — mutations DVF historiques (anti-suppression)
-- ----------------------------------------------------------------------------
-- DVF officiel sur data.gouv.fr supprime les anciennes années tous les 4-5 ans.
-- BRH archive en local pour préserver l'historique (clause Quelfoncier rule).
--
-- Granularité : 1 row = 1 mutation DVF. Lié à une parcelle via parcelle_idu (peut
-- être null si géométrie hors cadastre — rare mais existe pour terrains agricoles).
CREATE TABLE IF NOT EXISTS brh_dvf_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ID DVF officiel (id_mutation = clé naturelle data.gouv DVF)
  id_mutation TEXT UNIQUE NOT NULL,

  -- Date + nature
  date_mutation DATE NOT NULL,
  nature_mutation TEXT NOT NULL,         -- "Vente", "Vente terrain à bâtir", "Adjudication", etc.

  -- Montant en cents (règle anti-bug #2)
  valeur_fonciere_cents BIGINT,          -- prix de la mutation HT (€ × 100)

  -- Localisation
  code_postal CHAR(5),
  commune TEXT,
  code_insee_commune CHAR(5),
  departement CHAR(2),
  adresse_numero TEXT,
  adresse_voie TEXT,

  -- Bien
  type_local TEXT,                       -- "Maison", "Appartement", "Local industriel", "Dépendance"
  surface_reelle_bati INTEGER,           -- m²
  nombre_pieces_principales INTEGER,
  surface_terrain INTEGER,               -- m²

  -- Référence cadastre
  parcelle_idu CHAR(14),                 -- soft FK vers brh_parcelles_cache

  -- Géolocalisation (DVF géoloc Cerema)
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Métadonnées de l'archive (year of source DVF, batch import id)
  source_year INTEGER NOT NULL,           -- ex: 2024 = données DVF millésime 2024
  archive_batch_id UUID,                  -- groupe par batch d'import (audit)
  raw_record JSONB,                       -- CSV row complet pour audit

  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_dvf_archive_parcelle
  ON brh_dvf_archive(parcelle_idu) WHERE parcelle_idu IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_dvf_archive_commune
  ON brh_dvf_archive(code_insee_commune, date_mutation DESC) WHERE code_insee_commune IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_dvf_archive_dept_year
  ON brh_dvf_archive(departement, source_year);
CREATE INDEX IF NOT EXISTS brh_dvf_archive_date
  ON brh_dvf_archive(date_mutation DESC);
CREATE INDEX IF NOT EXISTS brh_dvf_archive_type
  ON brh_dvf_archive(type_local) WHERE type_local IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_dvf_archive_geo
  ON brh_dvf_archive(lat, lng) WHERE lat IS NOT NULL;

COMMENT ON TABLE brh_dvf_archive IS
  'Phase 19 Sprint C — archive long-terme DVF (mutations historiques). Anti-suppression officielle 4-5 ans data.gouv.fr. Source = CSV DVF millésime annuel.';

-- ----------------------------------------------------------------------------
-- 2. brh_communes_sociodemo — cache enrichi par commune INSEE
-- ----------------------------------------------------------------------------
-- 1 row = 1 commune INSEE avec toutes les données sociodémographiques.
-- TTL 90j (les loyers et élections changent peu).
CREATE TABLE IF NOT EXISTS brh_communes_sociodemo (
  -- Clé : code INSEE commune (5 chars)
  code_insee CHAR(5) PRIMARY KEY,

  -- Métadonnées
  nom_commune TEXT NOT NULL,
  code_postal CHAR(5),
  departement CHAR(2),
  code_epci TEXT,                        -- code EPCI (intercommunalité)
  population INTEGER,                    -- INSEE recensement

  -- ===== LOYERS (CLAMEUR / INSEE carte des loyers) =====
  -- Loyer mensuel moyen au m² en CENTS (règle anti-bug #2)
  loyer_appartement_eur_cents INTEGER,           -- €/m² appartement
  loyer_maison_eur_cents INTEGER,                -- €/m² maison
  loyer_t1_t2_eur_cents INTEGER,                 -- €/m² petites surfaces
  loyer_t3_plus_eur_cents INTEGER,               -- €/m² grandes surfaces
  loyer_source_year INTEGER,                     -- année du référentiel

  -- ===== ÉLECTIONS (data.gouv.fr) =====
  -- Dernier scrutin présidentiel/législatif/municipal/européen
  -- Format JSONB : { presidentielle_2022: { tour1: { ... }, tour2: { ... } }, ... }
  elections_resultats JSONB DEFAULT '{}',

  -- Couleur politique dominante (calculée depuis le dernier scrutin)
  couleur_politique TEXT
    CHECK (couleur_politique IS NULL OR couleur_politique IN (
      'extreme_gauche','gauche','centre_gauche','centre','centre_droit',
      'droite','extreme_droite','divers','non_renseigne'
    )),

  -- ===== ÉLUS (api.gouv.fr/repertoire-national-des-elus) =====
  -- Format JSONB : [{ nom, prenom, mandat, parti?, debut_mandat }]
  elus_municipaux JSONB DEFAULT '[]',
  maire_nom TEXT,
  maire_prenom TEXT,
  maire_parti TEXT,

  -- ===== INSEE FILOSOFI (revenus / décile / pauvreté) =====
  -- Filosofi 2021 millésimé annuel commune
  revenu_median_disponible_eur_cents BIGINT,     -- median niveau de vie €/UC × 100 cents
  taux_pauvrete_pct SMALLINT,                    -- 0-100
  decile_revenu_median SMALLINT,                 -- 1-10 (D1 le plus pauvre)
  filosofi_source_year INTEGER,

  -- ===== INSEE RECENSEMENT (CSP, propriétaires, ancienneté) =====
  pct_proprietaires SMALLINT,                    -- % logements occupés par propriétaires
  pct_residences_secondaires SMALLINT,
  pct_logements_avant_1975 SMALLINT,
  pct_csp_cadres SMALLINT,                       -- % CSP+ (cadres + professions intermédiaires sup)
  pct_csp_employes SMALLINT,
  pct_csp_ouvriers SMALLINT,
  recensement_source_year INTEGER,

  -- ===== GENTRIFICATION (DV3F mutations 5 ans + Filosofi évolution) =====
  -- Score de gentrification 0-100 (calculé serveur)
  -- Critères : évolution revenus médian (+/- 5 ans) × volume mutations × prix moyen
  gentrification_score SMALLINT,
  gentrification_label TEXT
    CHECK (gentrification_label IS NULL OR gentrification_label IN (
      'declin','stable','dynamique','en_gentrification','gentrifiee','tres_gentrifiee'
    )),

  -- Cache TTL 90 jours
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 7776000,  -- 90 jours

  -- Sources brutes (audit + debug)
  raw_sources JSONB DEFAULT '{}',                -- { loyers_url, filosofi_url, elections_url, ... }

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_communes_sociodemo_dept
  ON brh_communes_sociodemo(departement);
CREATE INDEX IF NOT EXISTS brh_communes_sociodemo_postal
  ON brh_communes_sociodemo(code_postal);
CREATE INDEX IF NOT EXISTS brh_communes_sociodemo_gentrif
  ON brh_communes_sociodemo(gentrification_score DESC) WHERE gentrification_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_communes_sociodemo_decile
  ON brh_communes_sociodemo(decile_revenu_median);

COMMENT ON TABLE brh_communes_sociodemo IS
  'Phase 19 Sprint C — cache sociodémo par commune INSEE (loyers CLAMEUR + élections data.gouv + élus RNE + Filosofi + Recensement + score gentrification). TTL 90j.';

COMMENT ON COLUMN brh_communes_sociodemo.gentrification_score IS
  'Score 0-100 calculé serveur : évolution revenu médian 5 ans × volume mutations DVF × prix moyen. 0=déclin, 50=stable, 100=très gentrifiée.';

-- ----------------------------------------------------------------------------
-- 3. Triggers updated_at
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_brh_communes_sociodemo_updated ON brh_communes_sociodemo;
CREATE TRIGGER trg_brh_communes_sociodemo_updated
  BEFORE UPDATE ON brh_communes_sociodemo
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Helper SECURITY DEFINER : DVF stats commune (pour gentrification + UI)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_dvf_commune_stats(
  p_code_insee CHAR(5),
  p_years_back INT DEFAULT 5
)
RETURNS TABLE (
  total_mutations INT,
  prix_median_eur_cents BIGINT,
  prix_moyen_eur_cents BIGINT,
  prix_min_eur_cents BIGINT,
  prix_max_eur_cents BIGINT,
  surface_median_m2 INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    count(*)::INT AS total_mutations,
    (percentile_cont(0.5) WITHIN GROUP (ORDER BY valeur_fonciere_cents))::BIGINT AS prix_median_eur_cents,
    avg(valeur_fonciere_cents)::BIGINT AS prix_moyen_eur_cents,
    min(valeur_fonciere_cents) AS prix_min_eur_cents,
    max(valeur_fonciere_cents) AS prix_max_eur_cents,
    (percentile_cont(0.5) WITHIN GROUP (ORDER BY surface_reelle_bati))::INT AS surface_median_m2
  FROM public.brh_dvf_archive
  WHERE code_insee_commune = p_code_insee
    AND date_mutation >= (CURRENT_DATE - (p_years_back || ' years')::INTERVAL)
    AND valeur_fonciere_cents > 0
    AND type_local IN ('Maison','Appartement');
$$;

GRANT EXECUTE ON FUNCTION public.brh_dvf_commune_stats(CHAR, INT) TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_dvf_commune_stats(CHAR, INT) IS
  'Phase 19 Sprint C — stats DVF commune (mutations + prix médian/moyen/min/max + surface). Filtre Maison/Appartement uniquement.';

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------
ALTER TABLE brh_dvf_archive               ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_communes_sociodemo        ENABLE ROW LEVEL SECURITY;

-- ----- brh_dvf_archive (lecture pour tout pro authentifié — données publiques DVF)
DROP POLICY IF EXISTS dvf_archive_authenticated_select ON brh_dvf_archive;
CREATE POLICY dvf_archive_authenticated_select ON brh_dvf_archive
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : DVF = données publiques data.gouv.fr

DROP POLICY IF EXISTS dvf_archive_admin_all ON brh_dvf_archive;
CREATE POLICY dvf_archive_admin_all ON brh_dvf_archive
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- brh_communes_sociodemo (lecture pour tout pro authentifié)
DROP POLICY IF EXISTS communes_sociodemo_authenticated_select ON brh_communes_sociodemo;
CREATE POLICY communes_sociodemo_authenticated_select ON brh_communes_sociodemo
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : sources publiques INSEE/data.gouv

DROP POLICY IF EXISTS communes_sociodemo_admin_all ON brh_communes_sociodemo;
CREATE POLICY communes_sociodemo_admin_all ON brh_communes_sociodemo
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;

-- =============================================================================
-- Vérification post-migration
-- =============================================================================
SELECT 'dvf_archive' AS table_name, count(*) AS rows FROM brh_dvf_archive
UNION ALL SELECT 'communes_sociodemo', count(*) FROM brh_communes_sociodemo;
