-- =============================================================================
-- Phase 18 v2 — Pivot Réseau : Disponibilités pro (12/05/2026)
-- =============================================================================
-- Contexte : audit-ux-2026-05-12 point #4 — Philippe valide la refonte Phase 18.
-- On supprime le fil d'actu libre (les tables brh_feed_* restent en DB pour
-- réversibilité, mais ne sont plus exposées côté UI), et on garde uniquement
-- 2 actions structurées : (1) publier un chantier (table existante
-- brh_chantier_offers déjà OK), et (2) signaler une disponibilité (NOUVEAU).
--
-- Toggle audience : utilise `visibility` (public|reseau|prive) déjà présente
-- sur brh_chantier_offers, et ajouté ici à brh_disponibilites.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. brh_disponibilites — un pro signale qu'il est dispo telle période / zone
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brh_disponibilites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  -- Pro qui signale sa dispo
  pro_id UUID NOT NULL REFERENCES brh_partner_contracts(id) ON DELETE CASCADE,

  -- Période de disponibilité
  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,

  -- Métiers que le pro est dispo à exécuter (sous-ensemble de ses spécialités)
  metiers_proposes TEXT[] NOT NULL DEFAULT '{}',

  -- Zone géographique (départements bretons typiquement : 22, 29, 35, 56)
  departements TEXT[] NOT NULL DEFAULT '{}',

  -- Description libre (capacités équipe, type chantier préféré, contraintes)
  description TEXT,

  -- Capacité dispo (nombre de chantiers parallèles possibles)
  capacite_chantiers INTEGER,

  -- Mode contrat préféré (cohérent avec brh_chantier_offers.contract_mode)
  contract_mode_pref TEXT NOT NULL DEFAULT 'sous_traitance'
    CHECK (contract_mode_pref IN ('sous_traitance','co_traitance','apport','tous')),

  -- Visibilité : aligné avec brh_chantier_offers (public|reseau|prive)
  --   public  : visible par tous les partenaires BRH (même hors réseau)
  --   reseau  : visible uniquement par les connexions acceptées
  --   prive   : draft, non visible publié
  visibility TEXT NOT NULL DEFAULT 'reseau'
    CHECK (visibility IN ('public','reseau','prive')),

  -- Workflow
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','archived','expired')),

  expires_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Contrainte logique : période cohérente
  CONSTRAINT periode_coherente CHECK (periode_fin >= periode_debut)
);

CREATE INDEX IF NOT EXISTS brh_disponibilites_active
  ON brh_disponibilites(tenant_id, periode_debut)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS brh_disponibilites_pro
  ON brh_disponibilites(pro_id, status);

CREATE INDEX IF NOT EXISTS brh_disponibilites_metiers
  ON brh_disponibilites USING GIN(metiers_proposes);

CREATE INDEX IF NOT EXISTS brh_disponibilites_depts
  ON brh_disponibilites USING GIN(departements);

COMMENT ON TABLE brh_disponibilites IS
  'Phase 18 v2 — Pro signale sa disponibilité (période + zone + métiers). Remplace
  le fil d''actu libre par une UX structurée (cf audit-ux-2026-05-12 point #4).
  Visibilité public/reseau/prive alignée avec brh_chantier_offers.';

-- ----------------------------------------------------------------------------
-- 2. Trigger updated_at
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION brh_disponibilites_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_brh_disponibilites ON brh_disponibilites;
CREATE TRIGGER set_updated_at_brh_disponibilites
  BEFORE UPDATE ON brh_disponibilites
  FOR EACH ROW
  EXECUTE FUNCTION brh_disponibilites_set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. RLS — alignée avec brh_chantier_offers
-- ----------------------------------------------------------------------------

ALTER TABLE brh_disponibilites ENABLE ROW LEVEL SECURITY;

-- Lecture : selon visibility (public partout, reseau si connexion, prive owner only)
CREATE POLICY "Read disponibilites visibility" ON brh_disponibilites
  FOR SELECT TO authenticated
  USING (
    -- Owner voit toujours sa dispo
    pro_id = brh_user_pro_id()
    OR
    -- Admin voit tout
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
    OR
    -- public : tous les partenaires BRH authentifiés
    (visibility = 'public' AND status = 'active')
    OR
    -- reseau : connexions acceptées uniquement
    (visibility = 'reseau' AND status = 'active' AND brh_pro_in_network(brh_user_pro_id(), pro_id))
  );

-- Insert : owner pro uniquement
CREATE POLICY "Insert own dispo" ON brh_disponibilites
  FOR INSERT TO authenticated
  WITH CHECK (pro_id = brh_user_pro_id());

-- Update : owner ou admin
CREATE POLICY "Update own dispo" ON brh_disponibilites
  FOR UPDATE TO authenticated
  USING (pro_id = brh_user_pro_id() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (pro_id = brh_user_pro_id() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Delete : owner ou admin
CREATE POLICY "Delete own dispo" ON brh_disponibilites
  FOR DELETE TO authenticated
  USING (pro_id = brh_user_pro_id() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 4. Helper : auto-expirer les dispos dont periode_fin est dépassée
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION brh_expire_old_disponibilites()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.brh_disponibilites
  SET status = 'expired'
  WHERE status = 'active'
    AND periode_fin < CURRENT_DATE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION brh_expire_old_disponibilites IS
  'Passe en status=expired les dispos dont periode_fin est dépassée. À appeler par cron quotidienne.';

COMMIT;
