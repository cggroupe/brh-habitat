-- ============================================================================
-- Phase R1 — Refonte : Fondations DB (permissions employé + tracking terrain)
-- ============================================================================
--
-- Objectifs :
--   1. Permissions JSONB granulaires sur brh_company_members (MemberRole=member)
--   2. Table brh_agences_immo (préparation Phase 16, alimentation manuelle MVP)
--   3. Table brh_field_visits (tracking commercial terrain : porte-à-porte,
--      consultations) — visible à tous les membres de la même company
--   4. Helper SECURITY DEFINER `brh_user_can(user_id, perm_key)` pour permissions
--
-- Les RLS existantes sur brh_pro_subscriptions / brh_commission_invoices /
-- brh_recruitment_commissions filtrent déjà par profile_id = auth.uid() —
-- elles ne nécessitent pas de modification : un member ne voit naturellement
-- pas les financiers de l'owner. Le travail "permissions" est principalement
-- côté front (masquage des entrées de menu) via <PermissionGate>.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Permissions granulaires sur brh_company_members
-- ----------------------------------------------------------------------------
ALTER TABLE brh_company_members
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN brh_company_members.permissions IS
  'Phase R1 — permissions granulaires pour MemberRole=member. '
  'Clés supportées : canViewFinance, canManageEmployees, canExport, '
  'canSendCourriers, canManageMarketplace. owner ignore ce champ (= tout autorisé).';

-- ----------------------------------------------------------------------------
-- 2. Table brh_agences_immo (préparation Phase 16)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_agences_immo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  siret CHAR(14) UNIQUE,
  raison_sociale TEXT NOT NULL,
  representant TEXT,
  email TEXT,
  telephone TEXT,
  site_web TEXT,

  adresse TEXT,
  code_postal CHAR(5),
  commune TEXT,
  code_insee CHAR(5),
  departement CHAR(2),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,

  -- Carte professionnelle T (loi Hoguet) — rempli quand validé
  carte_t_numero TEXT,
  carte_t_validite DATE,

  status TEXT NOT NULL DEFAULT 'prospect'
    CHECK (status IN ('prospect','contacted','partenaire','refused')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_agences_immo_geo
  ON brh_agences_immo(latitude, longitude);
CREATE INDEX IF NOT EXISTS brh_agences_immo_dept
  ON brh_agences_immo(departement);
CREATE INDEX IF NOT EXISTS brh_agences_immo_status
  ON brh_agences_immo(status);

COMMENT ON TABLE brh_agences_immo IS
  'Phase R1 prep — agences immobilières. Alimentation manuelle pour MVP. '
  'Phase 16 (post-DPIA + avis avocat Hoguet) ajoutera : algo Score Vente, '
  'portail /agence dédié, génération courrier propriétaire vendeur.';

-- ----------------------------------------------------------------------------
-- 3. Table brh_field_visits (tracking commercial terrain — Phase R2)
-- ----------------------------------------------------------------------------
-- target_id en TEXT car polymorphe :
--   - prospect_dpe : id BIGINT (brh_dpe_prospects.id)
--   - artisan      : id UUID (brh_artisans_rge.id)
--   - agence_immo  : id UUID (brh_agences_immo.id)
-- L'app résout target_type → target_id côté front pour fetch les détails.
CREATE TABLE IF NOT EXISTS brh_field_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id UUID NOT NULL REFERENCES brh_companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  target_type TEXT NOT NULL
    CHECK (target_type IN ('prospect_dpe','artisan','agence_immo')),
  target_id TEXT NOT NULL,

  visit_type TEXT NOT NULL
    CHECK (visit_type IN ('door_to_door','consultation','rappel','rdv_signe')),
  status TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned','completed','no_answer','refused','interested')),

  notes TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_field_visits_company_target
  ON brh_field_visits(company_id, target_type, target_id);
CREATE INDEX IF NOT EXISTS brh_field_visits_employee_completed
  ON brh_field_visits(employee_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS brh_field_visits_geo
  ON brh_field_visits(lat, lng);
CREATE INDEX IF NOT EXISTS brh_field_visits_company_status
  ON brh_field_visits(company_id, status);

COMMENT ON TABLE brh_field_visits IS
  'Phase R2 — tracking commercial terrain (porte-à-porte, consultations) '
  'par employés pros sur prospects DPE / artisans / agences immo. '
  'Visible à tous les membres de la même company pour éviter les doublons.';

-- ----------------------------------------------------------------------------
-- 4. RLS — brh_field_visits
-- ----------------------------------------------------------------------------
ALTER TABLE brh_field_visits ENABLE ROW LEVEL SECURITY;

-- SELECT : tous les membres de la même company voient
CREATE POLICY "field_visits_select_company_members" ON brh_field_visits
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM brh_company_members WHERE profile_id = auth.uid()
    )
  );

-- INSERT : un employé crée une visite pour sa company, où il est l'auteur
CREATE POLICY "field_visits_insert_own" ON brh_field_visits
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    AND company_id IN (
      SELECT company_id FROM brh_company_members WHERE profile_id = auth.uid()
    )
  );

-- UPDATE : un employé peut éditer ses propres visites uniquement
CREATE POLICY "field_visits_update_own" ON brh_field_visits
  FOR UPDATE TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- DELETE : owner de la company OU auteur de la visite
CREATE POLICY "field_visits_delete_owner_or_author" ON brh_field_visits
  FOR DELETE TO authenticated
  USING (
    employee_id = auth.uid()
    OR company_id IN (
      SELECT company_id FROM brh_company_members
      WHERE profile_id = auth.uid() AND member_role = 'owner'
    )
  );

-- Admin BRH : tout
CREATE POLICY "field_visits_admin_all" ON brh_field_visits
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- 5. RLS — brh_agences_immo
-- ----------------------------------------------------------------------------
ALTER TABLE brh_agences_immo ENABLE ROW LEVEL SECURITY;

-- SELECT : tout pro authentifié + admin
CREATE POLICY "agences_select_pro_admin" ON brh_agences_immo
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('pro','admin')
    )
  );

-- ALL (INSERT/UPDATE/DELETE) : admin uniquement pour MVP
-- Phase 16 ajoutera des policies pro pour CRUD limité.
CREATE POLICY "agences_admin_all" ON brh_agences_immo
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- 6. Helper permissions — brh_user_can(user_id, perm_key)
-- ----------------------------------------------------------------------------
-- Convention :
--   - admin BRH         → TRUE pour toute clé
--   - pro owner         → TRUE pour toute clé
--   - pro member        → permissions JSONB (clé → boolean)
--   - particulier       → FALSE (pas concerné par le système permissions pro)
--   - pas de membership → FALSE
CREATE OR REPLACE FUNCTION brh_user_can(p_user_id UUID, p_perm_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_role TEXT;
  v_member_role TEXT;
  v_permissions JSONB;
BEGIN
  IF p_user_id IS NULL THEN RETURN FALSE; END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_user_id;
  IF v_role = 'admin' THEN RETURN TRUE; END IF;

  SELECT member_role, permissions
    INTO v_member_role, v_permissions
  FROM public.brh_company_members
  WHERE profile_id = p_user_id
  ORDER BY joined_at DESC
  LIMIT 1;

  IF v_member_role IS NULL THEN RETURN FALSE; END IF;
  IF v_member_role = 'owner' THEN RETURN TRUE; END IF;

  RETURN COALESCE((v_permissions ->> p_perm_key)::BOOLEAN, FALSE);
END;
$$;

COMMENT ON FUNCTION brh_user_can IS
  'Phase R1 — check permission granulaire. admin et owner = TRUE par défaut, '
  'member = lookup JSONB permissions. Utilisable côté SQL (RLS) et front (RPC).';

-- ----------------------------------------------------------------------------
-- 7. Triggers updated_at (génériques pour les nouvelles tables)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_refonte_set_updated_at()
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

CREATE TRIGGER trg_field_visits_updated
  BEFORE UPDATE ON brh_field_visits
  FOR EACH ROW EXECUTE FUNCTION brh_refonte_set_updated_at();

CREATE TRIGGER trg_agences_immo_updated
  BEFORE UPDATE ON brh_agences_immo
  FOR EACH ROW EXECUTE FUNCTION brh_refonte_set_updated_at();
