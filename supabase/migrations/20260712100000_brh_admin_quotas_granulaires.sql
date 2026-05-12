-- =============================================================================
-- Phase Admin V1 — Quotas granulaires + avertissements profils dormants
-- =============================================================================
-- Contexte : audit-ux-2026-05-12 point #5 (« Gestion granulaire des profils ») —
-- l'admin doit pouvoir overrider le quota d'un profil (agence / artisan / employé)
-- indépendamment de son tier, choisir la période (weekly/monthly) et recevoir
-- une alerte quand un profil reste dormant trop longtemps.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Overrides quota custom — colonnes nullable, NULL = use tier default
-- ----------------------------------------------------------------------------

ALTER TABLE brh_agence_subscriptions
  ADD COLUMN IF NOT EXISTS custom_quota INTEGER,
  ADD COLUMN IF NOT EXISTS quota_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (quota_period IN ('weekly', 'monthly'));

ALTER TABLE brh_employees
  ADD COLUMN IF NOT EXISTS custom_quota INTEGER,
  ADD COLUMN IF NOT EXISTS quota_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (quota_period IN ('weekly', 'monthly'));

ALTER TABLE brh_artisans_rge
  ADD COLUMN IF NOT EXISTS custom_quota INTEGER,
  ADD COLUMN IF NOT EXISTS quota_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (quota_period IN ('weekly', 'monthly'));

COMMENT ON COLUMN brh_agence_subscriptions.custom_quota IS
  'Override admin du quota mensuel. NULL = monthly_lead_quota du tier reste actif.';

-- ----------------------------------------------------------------------------
-- 2. Trigger : appliquer custom_quota au reset cron quand non-NULL
-- ----------------------------------------------------------------------------
-- Le reset cron existant (brh_reset_agence_monthly_quotas) doit honorer
-- custom_quota si défini. On le wrap dans une fonction qui calcule le quota effectif.

CREATE OR REPLACE FUNCTION brh_effective_quota(
  p_tier_quota INTEGER,
  p_custom_quota INTEGER
) RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(p_custom_quota, p_tier_quota);
$$;

COMMENT ON FUNCTION brh_effective_quota IS
  'Renvoie le quota effectif : custom_quota override si non-NULL, sinon tier_quota.';

-- ----------------------------------------------------------------------------
-- 3. Table brh_admin_profile_warnings — alertes profils dormants
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS brh_admin_profile_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL
    CHECK (target_type IN ('agence', 'artisan', 'employe')),
  target_id UUID NOT NULL,
  warning_type TEXT NOT NULL
    CHECK (warning_type IN ('dormant_no_lead', 'quota_unused', 'inactive_login', 'manual')),
  severity TEXT NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_notes TEXT
);

CREATE INDEX IF NOT EXISTS brh_admin_warnings_target_open
  ON brh_admin_profile_warnings(target_type, target_id)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS brh_admin_warnings_recent
  ON brh_admin_profile_warnings(created_at DESC)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE brh_admin_profile_warnings IS
  'Alertes admin sur profils (dormants, quota inutilisé, etc.). Append-only, resolved_at marque la prise en charge.';

ALTER TABLE brh_admin_profile_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage all warnings" ON brh_admin_profile_warnings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- ----------------------------------------------------------------------------
-- 4. RPC SECURITY DEFINER — admin set custom quota (audit-friendly)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION brh_admin_set_custom_quota(
  p_target_type TEXT,         -- 'agence' | 'artisan' | 'employe'
  p_target_id UUID,
  p_custom_quota INTEGER,     -- NULL = remove override (revert to tier default)
  p_quota_period TEXT         -- 'weekly' | 'monthly'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_target_table TEXT;
  v_old_quota INTEGER;
  v_result JSONB;
BEGIN
  -- Vérif admin
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden : admin requis';
  END IF;

  IF p_quota_period NOT IN ('weekly', 'monthly') THEN
    RAISE EXCEPTION 'invalid_period : weekly ou monthly attendu';
  END IF;

  IF p_target_type = 'agence' THEN
    SELECT custom_quota INTO v_old_quota
    FROM public.brh_agence_subscriptions WHERE agence_id = p_target_id;

    UPDATE public.brh_agence_subscriptions
    SET custom_quota = p_custom_quota,
        quota_period = p_quota_period
    WHERE agence_id = p_target_id;

  ELSIF p_target_type = 'artisan' THEN
    SELECT custom_quota INTO v_old_quota
    FROM public.brh_artisans_rge WHERE id = p_target_id;

    UPDATE public.brh_artisans_rge
    SET custom_quota = p_custom_quota,
        quota_period = p_quota_period
    WHERE id = p_target_id;

  ELSIF p_target_type = 'employe' THEN
    SELECT custom_quota INTO v_old_quota
    FROM public.brh_employees WHERE id = p_target_id;

    UPDATE public.brh_employees
    SET custom_quota = p_custom_quota,
        quota_period = p_quota_period
    WHERE id = p_target_id;

  ELSE
    RAISE EXCEPTION 'invalid_target_type : agence, artisan ou employe attendu';
  END IF;

  v_result := jsonb_build_object(
    'ok', true,
    'target_type', p_target_type,
    'target_id', p_target_id,
    'old_custom_quota', v_old_quota,
    'new_custom_quota', p_custom_quota,
    'quota_period', p_quota_period,
    'set_by', auth.uid(),
    'set_at', now()
  );

  -- Trace l'override comme warning info (audit trail)
  INSERT INTO public.brh_admin_profile_warnings (
    target_type, target_id, warning_type, severity, message, metadata, created_by
  ) VALUES (
    p_target_type,
    p_target_id,
    'manual',
    'info',
    CASE
      WHEN p_custom_quota IS NULL THEN 'Override quota retiré (retour au tier par défaut)'
      ELSE 'Quota override défini à ' || p_custom_quota::TEXT || ' / ' || p_quota_period
    END,
    v_result,
    auth.uid()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION brh_admin_set_custom_quota IS
  'Admin only — override le quota d''une agence/artisan/employé. Trace dans brh_admin_profile_warnings.';

-- ----------------------------------------------------------------------------
-- 5. RPC SECURITY DEFINER — détection profils dormants (callable par cron)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION brh_detect_dormant_profiles(
  p_threshold_days INTEGER DEFAULT 60
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  -- Agences : aucune mutation lead_assignments depuis N jours
  INSERT INTO public.brh_admin_profile_warnings (
    target_type, target_id, warning_type, severity, message, metadata
  )
  SELECT
    'agence',
    s.agence_id,
    'dormant_no_lead',
    'warning',
    'Agence sans lead claim depuis ' || p_threshold_days::TEXT || ' jours',
    jsonb_build_object('threshold_days', p_threshold_days, 'tier', s.tier)
  FROM public.brh_agence_subscriptions s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.brh_lead_assignments la
    WHERE la.agence_id = s.agence_id
      AND la.claimed_at >= now() - (p_threshold_days || ' days')::INTERVAL
  )
  -- Skip si déjà un warning ouvert pour cette agence
  AND NOT EXISTS (
    SELECT 1 FROM public.brh_admin_profile_warnings w
    WHERE w.target_type = 'agence'
      AND w.target_id = s.agence_id
      AND w.warning_type = 'dormant_no_lead'
      AND w.resolved_at IS NULL
  );

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION brh_detect_dormant_profiles IS
  'Détecte les agences sans lead claim depuis N jours et insère des warnings. Idempotent (skip si warning ouvert).';

COMMIT;
