-- =============================================================================
-- Phase 19 Sprint D — IA killer features : PLU résumé + Vision toiture
-- =============================================================================
--
-- 2 nouvelles tables (caches IA) :
--   1. brh_plu_summaries          — résumé PLUi par commune (Claude Sonnet 4.6, TTL 180j)
--   2. brh_satellite_analyses     — analyse Vision IA toiture par parcelle (Claude Sonnet vision, TTL 365j)
--
-- Conformité 14 règles :
--   #5  COMMIT à la fin
--   #11 TIMESTAMPTZ
--   #12 SET search_path = '' sur SECURITY DEFINER
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_plu_summaries — résumé PLUi par commune via Claude Sonnet 4.6
-- ----------------------------------------------------------------------------
-- PK : code_insee (1 résumé global par commune V1)
-- V2 : ajouter zone_code pour résumé par zone (UC1, AU2, etc.)
-- TTL 180 jours (PLU change rarement, et le cache reste pertinent même après MAJ partielles)
CREATE TABLE IF NOT EXISTS brh_plu_summaries (
  code_insee CHAR(5) PRIMARY KEY,
  commune TEXT,
  departement CHAR(2),

  -- Source GPU document
  gpu_document_id TEXT,                  -- ID document GPU (geoportail-urbanisme.gouv.fr)
  gpu_document_type TEXT,                -- 'PLU', 'PLUi', 'POS', 'CC', 'RNU'
  gpu_document_date DATE,                -- date d'approbation du document
  gpu_pdf_url TEXT,                      -- URL PDF source

  -- Résumé structuré (JSONB pour flexibilité)
  -- Format attendu :
  -- {
  --   "zones_principales": [{"code": "UC1", "libelle": "...", "hauteur_max_m": 12, "cos": 0.6, "parking_min": "1/logt"}],
  --   "abf_zones": ["AC1", "ZH"],
  --   "mentions_obligatoires": ["...", "..."],
  --   "synthese": "..."
  -- }
  summary JSONB NOT NULL DEFAULT '{}',

  -- Métadonnées qualité
  ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  ai_tokens_input INTEGER,
  ai_tokens_output INTEGER,
  ai_cost_eur_cents INTEGER,             -- coût en cents (règle #2) — typiquement 1-3 cents
  pdf_pages INTEGER,                     -- nombre de pages du PDF source

  -- Cache TTL 180 jours
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 15552000,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_plu_summaries_dept
  ON brh_plu_summaries(departement);
CREATE INDEX IF NOT EXISTS brh_plu_summaries_doc_type
  ON brh_plu_summaries(gpu_document_type);

COMMENT ON TABLE brh_plu_summaries IS
  'Phase 19 Sprint D — résumé IA PDF PLUi par commune via Claude Sonnet 4.6. Cache 180j. Source = GPU geoportail-urbanisme.gouv.fr.';

COMMENT ON COLUMN brh_plu_summaries.summary IS
  'JSONB structuré : zones_principales[] + abf_zones[] + mentions_obligatoires[] + synthese. Format évolutif V1→V2.';

-- ----------------------------------------------------------------------------
-- 2. brh_satellite_analyses — Vision IA toiture par parcelle
-- ----------------------------------------------------------------------------
-- PK : parcelle_idu (1 analyse par parcelle)
-- TTL 365 jours (toiture change très peu)
CREATE TABLE IF NOT EXISTS brh_satellite_analyses (
  parcelle_idu CHAR(14) PRIMARY KEY,

  -- Snapshot localisation pour debug
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  bbox_meters INTEGER NOT NULL DEFAULT 80,    -- BBOX carré côté en m (40m à gauche/droite)

  -- Résultats Vision IA (JSONB pour flexibilité)
  -- Format attendu :
  -- {
  --   "type_toiture": "tuile_mecanique" | "ardoise" | "tuile_canal" | "zinc" | "tole" | "terrasse" | "autre",
  --   "nb_pans": 2 | 4 | "monopente",
  --   "orientation_principale": "N"|"NE"|"E"|"SE"|"S"|"SW"|"W"|"NW"|"plat",
  --   "surface_estimee_m2": 120,
  --   "etat_apparent": "neuf"|"bon"|"a_renover"|"degrade",
  --   "ombre_solaire": "aucune"|"partielle"|"importante",
  --   "veluxes_visibles": 0,
  --   "potentiel_pv": "excellent"|"bon"|"moyen"|"faible",
  --   "commentaires": "..."
  -- }
  analysis JSONB NOT NULL DEFAULT '{}',

  -- Image source (URL signée Storage si on veut conserver l'image, NULL V1 pour économiser)
  image_storage_path TEXT,
  image_url_used TEXT,                  -- URL WMS BD ORTHO utilisée

  -- Métadonnées IA
  ai_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  ai_tokens_input INTEGER,
  ai_tokens_output INTEGER,
  ai_cost_eur_cents INTEGER,            -- coût en cents

  -- Cache TTL 365 jours
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 31536000,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_satellite_pv
  ON brh_satellite_analyses((analysis->>'potentiel_pv'))
  WHERE analysis->>'potentiel_pv' IS NOT NULL;

COMMENT ON TABLE brh_satellite_analyses IS
  'Phase 19 Sprint D — analyse Vision IA toiture (Claude Sonnet 4.6 vision) sur crop aérien IGN BD ORTHO. Cache 365j.';

-- ----------------------------------------------------------------------------
-- 3. Triggers updated_at
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_brh_plu_summaries_updated ON brh_plu_summaries;
CREATE TRIGGER trg_brh_plu_summaries_updated
  BEFORE UPDATE ON brh_plu_summaries
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_satellite_analyses_updated ON brh_satellite_analyses;
CREATE TRIGGER trg_brh_satellite_analyses_updated
  BEFORE UPDATE ON brh_satellite_analyses
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE brh_plu_summaries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_satellite_analyses     ENABLE ROW LEVEL SECURITY;

-- ----- brh_plu_summaries (lecture pour tout pro authentifié — données dérivées de PLU public)
DROP POLICY IF EXISTS plu_summaries_authenticated_select ON brh_plu_summaries;
CREATE POLICY plu_summaries_authenticated_select ON brh_plu_summaries
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : cache résumé IA de PLU = donnée publique dérivée

DROP POLICY IF EXISTS plu_summaries_admin_all ON brh_plu_summaries;
CREATE POLICY plu_summaries_admin_all ON brh_plu_summaries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----- brh_satellite_analyses (lecture pour tout pro authentifié)
DROP POLICY IF EXISTS satellite_authenticated_select ON brh_satellite_analyses;
CREATE POLICY satellite_authenticated_select ON brh_satellite_analyses
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : analyse aérienne dérivée de BD ORTHO publique IGN

DROP POLICY IF EXISTS satellite_admin_all ON brh_satellite_analyses;
CREATE POLICY satellite_admin_all ON brh_satellite_analyses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;

-- =============================================================================
-- Vérification
-- =============================================================================
SELECT 'plu_summaries' AS table_name, count(*) AS rows FROM brh_plu_summaries
UNION ALL SELECT 'satellite_analyses', count(*) FROM brh_satellite_analyses;
