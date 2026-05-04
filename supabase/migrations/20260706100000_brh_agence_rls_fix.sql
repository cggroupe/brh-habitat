-- =============================================================================
-- Fix RLS — autoriser les agences (signataires de charte active) à voir
-- score_vente_v1, lead_assignments, dpe_prospects
-- =============================================================================
--
-- Bug Phase 16.0.6 : les policies SELECT sur brh_score_vente_v1,
-- brh_lead_assignments et brh_dpe_prospects exigent profiles.role IN ('pro',
-- 'admin'). Mais le compte agence a role='user' (l'accès au portail /agence
-- est contrôlé par AgenceGuard via brh_partner_contracts, pas par profile.role).
--
-- Conséquence : un user logué sur /agence/score-vente reçoit `[]` pour toutes
-- les queries — la map est vide, le tableau aussi.
--
-- Fix : ajouter des policies SELECT qui autorisent les signataires d'une
-- charte 'agence_immo' active à lire ces 3 tables. On utilise un helper
-- SECURITY DEFINER pour factoriser la condition.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- Helper : true si auth.uid() est signataire d'une charte agence active
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_user_is_active_agence_signer()
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
  );
$$;

COMMENT ON FUNCTION public.brh_user_is_active_agence_signer() IS
  'RLS helper Phase 16.0.6 fix : true si user logué a une charte agence active.';

GRANT EXECUTE ON FUNCTION public.brh_user_is_active_agence_signer() TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 1. brh_score_vente_v1 — SELECT autorisé pour agences actives
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS score_vente_select_agence ON brh_score_vente_v1;
CREATE POLICY score_vente_select_agence ON brh_score_vente_v1
  FOR SELECT
  TO authenticated
  USING (public.brh_user_is_active_agence_signer());

-- ----------------------------------------------------------------------------
-- 2. brh_lead_assignments — SELECT autorisé pour agences actives
--    (leurs PROPRES claims uniquement)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS lead_assignments_select_agence ON brh_lead_assignments;
CREATE POLICY lead_assignments_select_agence ON brh_lead_assignments
  FOR SELECT
  TO authenticated
  USING (
    public.brh_user_is_active_agence_signer()
    AND agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

-- En complément : aussi UPDATE sur leurs propres assignments (pour logAttempt)
DROP POLICY IF EXISTS lead_assignments_update_agence ON brh_lead_assignments;
CREATE POLICY lead_assignments_update_agence ON brh_lead_assignments
  FOR UPDATE
  TO authenticated
  USING (
    public.brh_user_is_active_agence_signer()
    AND agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. brh_dpe_prospects — SELECT autorisé pour agences actives
--    (lecture uniquement, pour afficher les détails commune/lat/lng/surface)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS dpe_prospects_select_agence ON brh_dpe_prospects;
CREATE POLICY dpe_prospects_select_agence ON brh_dpe_prospects
  FOR SELECT
  TO authenticated
  USING (public.brh_user_is_active_agence_signer());

-- ----------------------------------------------------------------------------
-- 4. brh_agences_immo — SELECT pour le membre signataire (sa propre agence)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS agences_immo_select_signer ON brh_agences_immo;
CREATE POLICY agences_immo_select_signer ON brh_agences_immo
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

COMMIT;

-- Sanity check : les nouvelles policies sont en place ?
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE '%_agence%' OR policyname LIKE '%signer%'
ORDER BY tablename, policyname;
