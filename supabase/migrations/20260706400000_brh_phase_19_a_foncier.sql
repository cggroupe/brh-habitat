-- =============================================================================
-- Phase 19 Sprint A — Foncier Pro Agence : foundation cadastre + favoris
-- =============================================================================
--
-- Objectif : poser les fondations DB du module Foncier Pro pour le portail agence.
-- Sprint A = foundation (cadastre IGN + favoris). Sprints B-F suivent.
--
-- 2 nouvelles tables :
--   1. brh_parcelles_cache              — cache GeoJSON api-carto IGN (TTL 90j)
--   2. brh_agence_favoris_parcelles     — favoris agence (parcelle + tags + notes)
--
-- 1 helper SECURITY DEFINER :
--   - brh_user_agence_id() — agence_id du user courant (NULL sinon)
--     [optionnel : peut déjà exister via Phase 16.1, on vérifie avec CREATE OR REPLACE]
--
-- Conformité 14 règles anti-bug :
--   #5  COMMIT à la fin (transactionnel)
--   #8  pas de USING (true) sur tables sensibles
--   #11 TIMESTAMPTZ partout
--   #12 SET search_path = '' sur fonctions SECURITY DEFINER
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Helper SECURITY DEFINER : agence_id du user courant
-- ----------------------------------------------------------------------------
-- Réutilise le pattern Phase 16.1. CREATE OR REPLACE pour idempotence si déjà créé.
CREATE OR REPLACE FUNCTION public.brh_user_agence_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  -- Cas 1 : signataire direct d'une charte agence active
  WITH signer AS (
    SELECT pc.agence_id
    FROM public.brh_partner_contracts pc
    WHERE pc.signer_profile_id = auth.uid()
      AND pc.status = 'active'
      AND pc.partner_type = 'agence_immo'
      AND pc.agence_id IS NOT NULL
    ORDER BY pc.signed_at DESC
    LIMIT 1
  ),
  -- Cas 2 : membre d'une agence (Phase 16.1 brh_agence_members)
  member AS (
    SELECT m.agence_id
    FROM public.brh_agence_members m
    WHERE m.profile_id = auth.uid()
    LIMIT 1
  )
  SELECT coalesce(
    (SELECT agence_id FROM signer),
    (SELECT agence_id FROM member)
  );
$$;

GRANT EXECUTE ON FUNCTION public.brh_user_agence_id() TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_user_agence_id() IS
  'Phase 19 Sprint A — agence_id du user courant (signataire ou member). NULL sinon. Utilisé par les RLS Foncier Pro.';

-- ----------------------------------------------------------------------------
-- 1. brh_parcelles_cache — cache GeoJSON api-carto IGN (TTL 90j)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_parcelles_cache (
  -- IDU = identifiant unique cadastre national : 14 caractères
  -- Format : code_insee(5) + prefixe_section(3) + code_section(2) + numero_parcelle(4)
  idu CHAR(14) PRIMARY KEY,

  code_insee CHAR(5) NOT NULL,
  prefixe CHAR(3),
  section CHAR(2),
  numero CHAR(4),

  commune TEXT,
  departement CHAR(2),

  -- Métriques parcelle
  contenance_m2 INTEGER,                  -- surface cadastrale en m²

  -- Géométrie en GeoJSON (cache)
  geometry JSONB NOT NULL,                -- type Polygon ou MultiPolygon
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,

  -- Métadonnées api-carto IGN brutes
  raw_properties JSONB,

  -- Cache TTL 90 jours
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 7776000, -- 90 jours

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_parcelles_cache_insee
  ON brh_parcelles_cache(code_insee);
CREATE INDEX IF NOT EXISTS brh_parcelles_cache_dept
  ON brh_parcelles_cache(departement) WHERE departement IN ('22','29','35','56','44');
CREATE INDEX IF NOT EXISTS brh_parcelles_cache_geo
  ON brh_parcelles_cache(centroid_lat, centroid_lng) WHERE centroid_lat IS NOT NULL;

COMMENT ON TABLE brh_parcelles_cache IS
  'Phase 19 Sprint A — cache GeoJSON parcelles cadastrales (api-carto IGN). TTL 90j. PK = idu (14 chars).';

COMMENT ON COLUMN brh_parcelles_cache.idu IS
  'Identifiant unique cadastre : code_insee(5) + prefixe_section(3) + code_section(2) + numero_parcelle(4).';

-- ----------------------------------------------------------------------------
-- 2. brh_agence_favoris_parcelles — favoris agence
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_agence_favoris_parcelles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Référence parcelle (FK soft vers brh_parcelles_cache.idu)
  parcelle_idu CHAR(14) NOT NULL,

  -- Snapshot dénormalisé pour affichage rapide même si cache expire
  parcelle_commune TEXT,
  parcelle_code_postal CHAR(5),
  parcelle_departement CHAR(2),
  parcelle_contenance_m2 INTEGER,

  -- Annotations agence
  tags TEXT[] DEFAULT '{}',                -- ex: ['cible_2026', 'sci_succession']
  notes TEXT,
  priorite TEXT NOT NULL DEFAULT 'normale'
    CHECK (priorite IN ('haute','normale','basse')),

  -- Workflow
  status TEXT NOT NULL DEFAULT 'a_etudier'
    CHECK (status IN ('a_etudier','contact_pris','offre_faite','vendu','abandonne')),
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Lien optionnel vers un prospect/lead BRH
  related_prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 1 favori unique par (agence, parcelle)
  UNIQUE (agence_id, parcelle_idu)
);

CREATE INDEX IF NOT EXISTS brh_agence_fav_agence
  ON brh_agence_favoris_parcelles(agence_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_agence_fav_status
  ON brh_agence_favoris_parcelles(agence_id, status);
CREATE INDEX IF NOT EXISTS brh_agence_fav_idu
  ON brh_agence_favoris_parcelles(parcelle_idu);
CREATE INDEX IF NOT EXISTS brh_agence_fav_dept
  ON brh_agence_favoris_parcelles(parcelle_departement) WHERE parcelle_departement IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_agence_fav_tags
  ON brh_agence_favoris_parcelles USING GIN(tags);

COMMENT ON TABLE brh_agence_favoris_parcelles IS
  'Phase 19 Sprint A — favoris parcelles cadastrales par agence immo. UNIQUE (agence, parcelle).';

-- ----------------------------------------------------------------------------
-- 3. updated_at auto sur les 2 tables
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_brh_parcelles_cache_updated ON brh_parcelles_cache;
CREATE TRIGGER trg_brh_parcelles_cache_updated
  BEFORE UPDATE ON brh_parcelles_cache
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

DROP TRIGGER IF EXISTS trg_brh_agence_fav_updated ON brh_agence_favoris_parcelles;
CREATE TRIGGER trg_brh_agence_fav_updated
  BEFORE UPDATE ON brh_agence_favoris_parcelles
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Trigger : mise à jour status_updated_at quand status change
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_fav_status_updated_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_agence_fav_status_updated ON brh_agence_favoris_parcelles;
CREATE TRIGGER trg_brh_agence_fav_status_updated
  BEFORE UPDATE ON brh_agence_favoris_parcelles
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_fav_status_updated_trigger();

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------

ALTER TABLE brh_parcelles_cache              ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_agence_favoris_parcelles     ENABLE ROW LEVEL SECURITY;

-- ----- brh_parcelles_cache (lecture pour tout pro authentifié, write service_role)
DROP POLICY IF EXISTS parcelles_cache_authenticated_select ON brh_parcelles_cache;
CREATE POLICY parcelles_cache_authenticated_select ON brh_parcelles_cache
  FOR SELECT TO authenticated
  USING (TRUE);  -- exception documentée : cache public api-carto IGN, données publiques

DROP POLICY IF EXISTS parcelles_cache_admin_all ON brh_parcelles_cache;
CREATE POLICY parcelles_cache_admin_all ON brh_parcelles_cache
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- service_role peut écrire (EF cadastre-fetch)
-- (service_role bypass RLS par défaut, pas besoin de policy)

-- ----- brh_agence_favoris_parcelles (agence owner CRUD)
DROP POLICY IF EXISTS agence_fav_owner_select ON brh_agence_favoris_parcelles;
CREATE POLICY agence_fav_owner_select ON brh_agence_favoris_parcelles
  FOR SELECT TO authenticated
  USING (agence_id = public.brh_user_agence_id());

DROP POLICY IF EXISTS agence_fav_owner_insert ON brh_agence_favoris_parcelles;
CREATE POLICY agence_fav_owner_insert ON brh_agence_favoris_parcelles
  FOR INSERT TO authenticated
  WITH CHECK (
    agence_id = public.brh_user_agence_id()
    AND added_by = auth.uid()
  );

DROP POLICY IF EXISTS agence_fav_owner_update ON brh_agence_favoris_parcelles;
CREATE POLICY agence_fav_owner_update ON brh_agence_favoris_parcelles
  FOR UPDATE TO authenticated
  USING (agence_id = public.brh_user_agence_id())
  WITH CHECK (agence_id = public.brh_user_agence_id());

DROP POLICY IF EXISTS agence_fav_owner_delete ON brh_agence_favoris_parcelles;
CREATE POLICY agence_fav_owner_delete ON brh_agence_favoris_parcelles
  FOR DELETE TO authenticated
  USING (agence_id = public.brh_user_agence_id());

DROP POLICY IF EXISTS agence_fav_admin_all ON brh_agence_favoris_parcelles;
CREATE POLICY agence_fav_admin_all ON brh_agence_favoris_parcelles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;

-- =============================================================================
-- Vérification post-migration
-- =============================================================================
SELECT 'parcelles_cache' AS table_name, count(*) AS rows FROM brh_parcelles_cache
UNION ALL SELECT 'agence_favoris_parcelles', count(*) FROM brh_agence_favoris_parcelles;
