-- =============================================================================
-- Phase 16.1 — brh_agence_members (équipe agence + permissions JSONB)
-- =============================================================================
--
-- Objectif : permettre à une agence (signer du partner_contract) d'inviter
-- ses collaborateurs commerciaux. Chaque membre a un rôle ('signer' ou
-- 'employee') et un set de permissions JSONB granulaires.
--
-- Pattern miroir de brh_company_members (Pro) — voir Phase R1.
--
-- Règles anti-bug appliquées :
--   #5  : if (error) throw — côté front
--   #6  : nouvelles routes restent gardées par AgenceGuard
--   #8  : pas de USING (true) — toujours une condition (signer OR member)
--   #11 : TIMESTAMPTZ partout
--   #12 : SET search_path = '' sur SECURITY DEFINER
--
-- Le V1 expose : invitation par email d'un user BRH existant, retrait,
-- réglage permissions. L'élargissement des policies RLS pour donner aux
-- employés l'accès aux tables agence (score_vente_v1, lead_assignments,
-- dpe_prospects, agences_immo, prospect_studies, etc.) est fait via le
-- nouveau helper `brh_user_has_agence_access()` qui remplace
-- `brh_user_is_active_agence_signer()` partout (additif et compatible).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table brh_agence_members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_agence_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('signer','employee'))
    DEFAULT 'employee',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  invited_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (agence_id, profile_id)
);

CREATE INDEX IF NOT EXISTS brh_agence_members_agence_idx
  ON brh_agence_members(agence_id);
CREATE INDEX IF NOT EXISTS brh_agence_members_profile_idx
  ON brh_agence_members(profile_id);

COMMENT ON TABLE brh_agence_members IS
  'Phase 16.1 — équipe d''une agence partenaire. signer = profile signataire de '
  'la charte (1 par agence) ; employee = collaborateur invité. Permissions '
  'JSONB miroir de brh_company_members.';

COMMENT ON COLUMN brh_agence_members.permissions IS
  'Clés supportées : canManageLeads, canSimulate, canShareSocial, '
  'canViewCommissions, canManageTeam. signer ignore ce champ (= tout autorisé).';

-- ----------------------------------------------------------------------------
-- 2. Seed : un row 'signer' pour chaque charte agence active
-- ----------------------------------------------------------------------------
INSERT INTO brh_agence_members (agence_id, profile_id, member_role, joined_at)
SELECT pc.agence_id, pc.signer_profile_id, 'signer', pc.signed_at
FROM brh_partner_contracts pc
WHERE pc.partner_type = 'agence_immo'
  AND pc.status = 'active'
  AND pc.agence_id IS NOT NULL
  AND pc.signer_profile_id IS NOT NULL
ON CONFLICT (agence_id, profile_id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Trigger : auto-ajouter le signer comme member quand contrat → active
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_signer_to_member_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.partner_type = 'agence_immo'
     AND NEW.status = 'active'
     AND NEW.agence_id IS NOT NULL
     AND NEW.signer_profile_id IS NOT NULL THEN
    INSERT INTO public.brh_agence_members
      (agence_id, profile_id, member_role, joined_at)
    VALUES (NEW.agence_id, NEW.signer_profile_id, 'signer', NEW.signed_at)
    ON CONFLICT (agence_id, profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brh_agence_signer_to_member ON brh_partner_contracts;
CREATE TRIGGER brh_agence_signer_to_member
  AFTER INSERT OR UPDATE ON brh_partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_signer_to_member_trigger();

-- ----------------------------------------------------------------------------
-- 4. Helper : true si auth.uid() a accès à n'importe quelle agence active
--    (signer OR employee) — remplace progressivement
--    brh_user_is_active_agence_signer dans les RLS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_user_has_agence_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brh_partner_contracts
    WHERE signer_profile_id = auth.uid()
      AND partner_type = 'agence_immo'
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.brh_agence_members am
    JOIN public.brh_partner_contracts pc
      ON pc.agence_id = am.agence_id
      AND pc.partner_type = 'agence_immo'
      AND pc.status = 'active'
    WHERE am.profile_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.brh_user_has_agence_access()
  TO authenticated, anon;

-- Helper scopé : true si auth.uid() est signer ou employee de p_agence_id
CREATE OR REPLACE FUNCTION public.brh_user_belongs_to_agence(p_agence_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brh_partner_contracts
    WHERE signer_profile_id = auth.uid()
      AND agence_id = p_agence_id
      AND partner_type = 'agence_immo'
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.brh_agence_members
    WHERE profile_id = auth.uid()
      AND agence_id = p_agence_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.brh_user_belongs_to_agence(UUID)
  TO authenticated, anon;

-- Helper : true si auth.uid() est SIGNER (pas employee) — pour writes admin agence
CREATE OR REPLACE FUNCTION public.brh_user_is_signer_of_agence(p_agence_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brh_partner_contracts
    WHERE signer_profile_id = auth.uid()
      AND agence_id = p_agence_id
      AND partner_type = 'agence_immo'
      AND status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.brh_user_is_signer_of_agence(UUID)
  TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 5. RLS sur brh_agence_members
-- ----------------------------------------------------------------------------
ALTER TABLE brh_agence_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agence_members_select ON brh_agence_members;
CREATE POLICY agence_members_select ON brh_agence_members
  FOR SELECT
  TO authenticated
  USING (public.brh_user_belongs_to_agence(agence_id));

DROP POLICY IF EXISTS agence_members_admin_all ON brh_agence_members;
CREATE POLICY agence_members_admin_all ON brh_agence_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Note : aucune policy INSERT/UPDATE/DELETE pour authenticated non-admin.
-- Toutes les écritures passent par les RPC SECURITY DEFINER ci-dessous,
-- qui valident "le caller est signer de l'agence cible".

-- ----------------------------------------------------------------------------
-- 6. RPC : inviter un employé (par email d'un profil BRH existant)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_invite_employee(
  p_email TEXT,
  p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_agence_id UUID;
  v_target_profile UUID;
  v_member_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  SELECT agence_id INTO v_agence_id
  FROM public.brh_partner_contracts
  WHERE signer_profile_id = v_caller
    AND partner_type = 'agence_immo'
    AND status = 'active'
  LIMIT 1;

  IF v_agence_id IS NULL THEN
    RAISE EXCEPTION 'caller_not_active_agence_signer'
      USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_target_profile
  FROM public.profiles
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  IF v_target_profile IS NULL THEN
    RAISE EXCEPTION 'profile_not_found'
      USING ERRCODE = 'P0002',
            HINT = 'L''utilisateur doit déjà avoir un compte BRH.';
  END IF;

  IF v_target_profile = v_caller THEN
    RAISE EXCEPTION 'cannot_invite_self' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.brh_agence_members
    (agence_id, profile_id, member_role, permissions, invited_by_profile_id)
  VALUES
    (v_agence_id, v_target_profile, 'employee', COALESCE(p_permissions, '{}'::jsonb), v_caller)
  ON CONFLICT (agence_id, profile_id) DO UPDATE
    SET permissions = EXCLUDED.permissions,
        invited_by_profile_id = EXCLUDED.invited_by_profile_id,
        invited_at = now()
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_agence_invite_employee(TEXT, JSONB)
  TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RPC : mettre à jour les permissions d'un employé
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_set_member_permissions(
  p_member_id UUID,
  p_permissions JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_agence_id UUID;
  v_role TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  SELECT agence_id, member_role INTO v_agence_id, v_role
  FROM public.brh_agence_members
  WHERE id = p_member_id;

  IF v_agence_id IS NULL THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'signer' THEN
    RAISE EXCEPTION 'cannot_modify_signer' USING ERRCODE = '42501';
  END IF;

  IF NOT public.brh_user_is_signer_of_agence(v_agence_id) THEN
    RAISE EXCEPTION 'only_signer_can_modify' USING ERRCODE = '42501';
  END IF;

  UPDATE public.brh_agence_members
  SET permissions = COALESCE(p_permissions, '{}'::jsonb)
  WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_agence_set_member_permissions(UUID, JSONB)
  TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC : retirer un employé
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_remove_member(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_agence_id UUID;
  v_role TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;

  SELECT agence_id, member_role INTO v_agence_id, v_role
  FROM public.brh_agence_members
  WHERE id = p_member_id;

  IF v_agence_id IS NULL THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role = 'signer' THEN
    RAISE EXCEPTION 'cannot_remove_signer' USING ERRCODE = '42501';
  END IF;

  IF NOT public.brh_user_is_signer_of_agence(v_agence_id) THEN
    RAISE EXCEPTION 'only_signer_can_remove' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.brh_agence_members
  WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_agence_remove_member(UUID)
  TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. Élargir les policies SELECT existantes : signer → signer OR employee
--    (additif & compatible — le signer continue de tout voir)
-- ----------------------------------------------------------------------------

-- 9.1 brh_score_vente_v1
DROP POLICY IF EXISTS score_vente_select_agence ON brh_score_vente_v1;
CREATE POLICY score_vente_select_agence ON brh_score_vente_v1
  FOR SELECT
  TO authenticated
  USING (public.brh_user_has_agence_access());

-- 9.2 brh_lead_assignments — SELECT/UPDATE scopés à son agence
DROP POLICY IF EXISTS lead_assignments_select_agence ON brh_lead_assignments;
CREATE POLICY lead_assignments_select_agence ON brh_lead_assignments
  FOR SELECT
  TO authenticated
  USING (public.brh_user_belongs_to_agence(agence_id));

DROP POLICY IF EXISTS lead_assignments_update_agence ON brh_lead_assignments;
CREATE POLICY lead_assignments_update_agence ON brh_lead_assignments
  FOR UPDATE
  TO authenticated
  USING (public.brh_user_belongs_to_agence(agence_id));

-- 9.3 brh_dpe_prospects
DROP POLICY IF EXISTS dpe_prospects_select_agence ON brh_dpe_prospects;
CREATE POLICY dpe_prospects_select_agence ON brh_dpe_prospects
  FOR SELECT
  TO authenticated
  USING (public.brh_user_has_agence_access());

-- 9.4 brh_agences_immo
DROP POLICY IF EXISTS agences_immo_select_signer ON brh_agences_immo;
CREATE POLICY agences_immo_select_member ON brh_agences_immo
  FOR SELECT
  TO authenticated
  USING (public.brh_user_belongs_to_agence(id));

-- 9.5 brh_prospect_studies (cache études) — utilise déjà brh_user_is_active_agence_signer
DROP POLICY IF EXISTS prospect_studies_select_agence ON brh_prospect_studies;
CREATE POLICY prospect_studies_select_agence ON brh_prospect_studies
  FOR SELECT
  TO authenticated
  USING (public.brh_user_has_agence_access());

COMMIT;

-- =============================================================================
-- Sanity checks
-- =============================================================================
SELECT 'brh_agence_members' AS table_name, COUNT(*) AS rows
FROM brh_agence_members;

SELECT 'helpers' AS kind, proname
FROM pg_proc
WHERE proname IN (
  'brh_user_has_agence_access',
  'brh_user_belongs_to_agence',
  'brh_user_is_signer_of_agence',
  'brh_agence_invite_employee',
  'brh_agence_set_member_permissions',
  'brh_agence_remove_member',
  'brh_agence_signer_to_member_trigger'
)
ORDER BY proname;
