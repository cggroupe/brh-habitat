-- =============================================================================
-- Phase 16.1 Step A — Économie unifiée de leads agences
-- =============================================================================
--
-- Avant : `brh_grant_lead_claim` ne décrémente que `monthly_lead_quota` du tier
-- Stripe ; les `bonus_leads_unlocked` (issus de social posts + contributions)
-- sont stockés mais jamais consommés. Bug structurel.
--
-- Après : 3 sources de bonus indépendantes (social / contribution / referral)
-- avec décomposition unlocked/consumed par source. Le RPC consomme d'abord le
-- tier, puis les bonus dans l'ordre alphabétique stable (contribution, referral,
-- social) si tier épuisé. Reset mensuel complet (tier + tous les bonus).
--
-- Ordre de priorité au claim :
--   1. tier (forfait Stripe)
--   2. contribution (apport prospect travaux signé)
--   3. referral (parrainage agence)         [NEW source]
--   4. social (publication réseau validée)
--
-- Nouvelle source `referral` : +5 leads par charte agence parrainée signée.
-- (Cascade 5 niveaux dans la migration suivante 20260706210000.)
--
-- Anti-bug appliqués : #5 throw, #11 TIMESTAMPTZ, #12 search_path=''.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Étendre brh_agence_progression : 6 nouvelles colonnes (3 sources)
-- ----------------------------------------------------------------------------
ALTER TABLE brh_agence_progression
  ADD COLUMN IF NOT EXISTS social_unlocked         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS social_consumed         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_unlocked   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contribution_consumed   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_unlocked       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_consumed       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonuses_period_start    TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now());

ALTER TABLE brh_agence_progression
  ADD CONSTRAINT brh_agence_progression_consume_social CHECK (social_consumed <= social_unlocked),
  ADD CONSTRAINT brh_agence_progression_consume_contrib CHECK (contribution_consumed <= contribution_unlocked),
  ADD CONSTRAINT brh_agence_progression_consume_referral CHECK (referral_consumed <= referral_unlocked);

COMMENT ON COLUMN brh_agence_progression.social_unlocked IS
  'Phase 16.1 Step A — leads bonus du mois courant débloqués via publi sociale validée. Reset 1er du mois.';
COMMENT ON COLUMN brh_agence_progression.contribution_unlocked IS
  'Leads bonus du mois courant débloqués via chantiers signés (5/chantier). Reset 1er du mois.';
COMMENT ON COLUMN brh_agence_progression.referral_unlocked IS
  'Leads bonus du mois courant débloqués via parrainage agence (5/charte signée). Reset 1er du mois.';

-- ----------------------------------------------------------------------------
-- 2. RPC central : breakdown des leads disponibles pour l'agence courante
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.brh_get_my_lead_breakdown();

CREATE OR REPLACE FUNCTION public.brh_get_my_lead_breakdown()
RETURNS TABLE (
  agence_id UUID,
  tier_subscription TEXT,
  tier_quota INTEGER,         -- NULL = illimité
  tier_used INTEGER,
  tier_remaining INTEGER,     -- NULL = illimité
  social_unlocked INTEGER,
  social_consumed INTEGER,
  social_remaining INTEGER,
  contribution_unlocked INTEGER,
  contribution_consumed INTEGER,
  contribution_remaining INTEGER,
  referral_unlocked INTEGER,
  referral_consumed INTEGER,
  referral_remaining INTEGER,
  bonus_total_remaining INTEGER,
  total_remaining INTEGER     -- NULL = illimité (tier expert)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH my_agence AS (
    -- Signer cas
    SELECT pc.agence_id
    FROM public.brh_partner_contracts pc
    WHERE pc.signer_profile_id = auth.uid()
      AND pc.partner_type = 'agence_immo'
      AND pc.status = 'active'
    UNION
    -- Employee cas
    SELECT am.agence_id
    FROM public.brh_agence_members am
    JOIN public.brh_partner_contracts pc
      ON pc.agence_id = am.agence_id
      AND pc.partner_type = 'agence_immo'
      AND pc.status = 'active'
    WHERE am.profile_id = auth.uid()
    LIMIT 1
  )
  SELECT
    a.agence_id,
    s.tier::TEXT,
    s.monthly_lead_quota,
    s.current_month_claims,
    CASE WHEN s.monthly_lead_quota IS NULL
         THEN NULL
         ELSE GREATEST(0, s.monthly_lead_quota - s.current_month_claims)
    END AS tier_remaining,
    coalesce(p.social_unlocked, 0),
    coalesce(p.social_consumed, 0),
    coalesce(p.social_unlocked, 0) - coalesce(p.social_consumed, 0),
    coalesce(p.contribution_unlocked, 0),
    coalesce(p.contribution_consumed, 0),
    coalesce(p.contribution_unlocked, 0) - coalesce(p.contribution_consumed, 0),
    coalesce(p.referral_unlocked, 0),
    coalesce(p.referral_consumed, 0),
    coalesce(p.referral_unlocked, 0) - coalesce(p.referral_consumed, 0),
    (coalesce(p.social_unlocked, 0) - coalesce(p.social_consumed, 0))
      + (coalesce(p.contribution_unlocked, 0) - coalesce(p.contribution_consumed, 0))
      + (coalesce(p.referral_unlocked, 0) - coalesce(p.referral_consumed, 0)) AS bonus_total_remaining,
    CASE WHEN s.monthly_lead_quota IS NULL
         THEN NULL
         ELSE GREATEST(0, s.monthly_lead_quota - s.current_month_claims)
              + (coalesce(p.social_unlocked, 0) - coalesce(p.social_consumed, 0))
              + (coalesce(p.contribution_unlocked, 0) - coalesce(p.contribution_consumed, 0))
              + (coalesce(p.referral_unlocked, 0) - coalesce(p.referral_consumed, 0))
    END AS total_remaining
  FROM my_agence a
  LEFT JOIN public.brh_agence_subscriptions s ON s.agence_id = a.agence_id
  LEFT JOIN public.brh_agence_progression p ON p.agence_id = a.agence_id;
$$;

GRANT EXECUTE ON FUNCTION public.brh_get_my_lead_breakdown() TO authenticated;

COMMENT ON FUNCTION public.brh_get_my_lead_breakdown IS
  'Phase 16.1 Step A — décomposition leads disponibles ce mois pour l''agence du caller (signer ou employee).';

-- ----------------------------------------------------------------------------
-- 3. Réécriture du RPC brh_grant_lead_claim avec logique unifiée
--    Ordre : tier → contribution → referral → social (alphabétique stable)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_grant_lead_claim(
  p_agence_id UUID,
  p_prospect_id BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub_id UUID;
  v_quota INTEGER;
  v_used INTEGER;
  v_tier_remaining INTEGER;
  v_progression_exists BOOLEAN;
  v_social_left INTEGER;
  v_contrib_left INTEGER;
  v_referral_left INTEGER;
  v_assignment_id UUID;
BEGIN
  -- Lock subscription
  SELECT id, monthly_lead_quota, current_month_claims
    INTO v_sub_id, v_quota, v_used
  FROM public.brh_agence_subscriptions
  WHERE agence_id = p_agence_id
  FOR UPDATE;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'no_active_subscription'
      USING ERRCODE = 'P0002',
            HINT = 'Aucun abonnement actif pour cette agence.';
  END IF;

  -- Tier remaining (NULL = illimité)
  IF v_quota IS NULL THEN
    v_tier_remaining := -1; -- sentinel "illimité"
  ELSE
    v_tier_remaining := GREATEST(0, v_quota - v_used);
  END IF;

  -- Lock progression (peut ne pas exister si l'agence n'a jamais débloqué de bonus)
  SELECT TRUE INTO v_progression_exists
  FROM public.brh_agence_progression
  WHERE agence_id = p_agence_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_progression_exists := FALSE;
    v_social_left := 0;
    v_contrib_left := 0;
    v_referral_left := 0;
  ELSE
    SELECT
      social_unlocked - social_consumed,
      contribution_unlocked - contribution_consumed,
      referral_unlocked - referral_consumed
      INTO v_social_left, v_contrib_left, v_referral_left
    FROM public.brh_agence_progression
    WHERE agence_id = p_agence_id;
  END IF;

  -- Refus si tout est à zéro et pas illimité
  IF v_tier_remaining = 0
     AND v_social_left = 0
     AND v_contrib_left = 0
     AND v_referral_left = 0 THEN
    RAISE EXCEPTION 'quota_exhausted'
      USING ERRCODE = '53400',
            HINT = 'Quota mensuel atteint. Aucun lead bonus disponible.';
  END IF;

  -- Crée l'assignment (UNIQUE INDEX prospect actif empêche double claim)
  INSERT INTO public.brh_lead_assignments (prospect_id, agence_id, status)
  VALUES (p_prospect_id, p_agence_id, 'active')
  RETURNING id INTO v_assignment_id;

  -- Décrémentation par priorité : tier > contribution > referral > social
  IF v_tier_remaining = -1 OR v_tier_remaining > 0 THEN
    -- Tier (paid). Si illimité (-1), on incrémente quand même current_month_claims
    -- pour le tracking — pas de cap.
    UPDATE public.brh_agence_subscriptions
    SET current_month_claims = current_month_claims + 1,
        updated_at = now()
    WHERE id = v_sub_id;

  ELSIF v_contrib_left > 0 THEN
    UPDATE public.brh_agence_progression
    SET contribution_consumed = contribution_consumed + 1,
        bonus_leads_consumed = bonus_leads_consumed + 1,
        updated_at = now()
    WHERE agence_id = p_agence_id;

  ELSIF v_referral_left > 0 THEN
    UPDATE public.brh_agence_progression
    SET referral_consumed = referral_consumed + 1,
        bonus_leads_consumed = bonus_leads_consumed + 1,
        updated_at = now()
    WHERE agence_id = p_agence_id;

  ELSIF v_social_left > 0 THEN
    UPDATE public.brh_agence_progression
    SET social_consumed = social_consumed + 1,
        bonus_leads_consumed = bonus_leads_consumed + 1,
        updated_at = now()
    WHERE agence_id = p_agence_id;
  END IF;

  RETURN v_assignment_id;
END;
$$;

COMMENT ON FUNCTION public.brh_grant_lead_claim IS
  'Phase 16.1 Step A — claim atomique avec consommation prioritaire tier > contribution > referral > social. '
  'Atomic via FOR UPDATE sur les 2 tables. Lève quota_exhausted si toutes sources à zéro.';

-- ----------------------------------------------------------------------------
-- 4. Reset mensuel : étend brh_reset_agence_monthly_quotas pour les bonus
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_reset_agence_monthly_quotas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subs_reset INTEGER;
  v_progress_reset INTEGER;
BEGIN
  -- Reset subscriptions tier
  WITH reset_subs AS (
    UPDATE public.brh_agence_subscriptions
    SET current_month_claims = 0,
        current_period_start = date_trunc('month', now()),
        current_period_end = date_trunc('month', now()) + interval '1 month',
        updated_at = now()
    WHERE current_period_end <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_subs_reset FROM reset_subs;

  -- Reset bonus sources (toutes ensemble)
  WITH reset_prog AS (
    UPDATE public.brh_agence_progression
    SET social_unlocked = 0,
        social_consumed = 0,
        contribution_unlocked = 0,
        contribution_consumed = 0,
        referral_unlocked = 0,
        referral_consumed = 0,
        bonus_leads_unlocked = 0,
        bonus_leads_consumed = 0,
        bonuses_period_start = date_trunc('month', now()),
        updated_at = now()
    WHERE bonuses_period_start < date_trunc('month', now())
    RETURNING agence_id
  )
  SELECT count(*) INTO v_progress_reset FROM reset_prog;

  RETURN v_subs_reset + v_progress_reset;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Trigger : remplace recompute_progression pour gérer les bonus mensuellement
--    Le tier (bronze/silver/gold/platinum) reste calculé sur lifetime,
--    mais contribution_unlocked compte uniquement les chantiers signés CE MOIS.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_recompute_progression(p_agence_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INT;
  v_qualified INT;
  v_signed INT;
  v_completed INT;
  v_due BIGINT;
  v_paid BIGINT;
  v_tier TEXT;
  -- Bonus mensuel : nombre de transitions vers 'quote_signed' ce mois × 5
  v_signed_this_month INT;
BEGIN
  -- Stats lifetime (palier tier)
  SELECT
    count(*),
    count(*) FILTER (WHERE status IN ('qualified','audit_done','quote_signed','completed')),
    count(*) FILTER (WHERE status IN ('quote_signed','completed')),
    count(*) FILTER (WHERE status = 'completed'),
    coalesce(sum(commission_amount_cents) FILTER (WHERE status IN ('quote_signed','completed')), 0),
    coalesce(sum(commission_amount_cents) FILTER (WHERE commission_paid_at IS NOT NULL), 0)
  INTO v_count, v_qualified, v_signed, v_completed, v_due, v_paid
  FROM public.brh_agence_contributions
  WHERE agence_id = p_agence_id;

  v_tier := CASE
    WHEN v_signed >= 25 THEN 'platinum'
    WHEN v_signed >= 10 THEN 'gold'
    WHEN v_signed >= 3  THEN 'silver'
    ELSE 'bronze'
  END;

  -- Chantiers signés CE MOIS uniquement (basé sur updated_at, approximation)
  SELECT count(*) FILTER (WHERE status IN ('quote_signed','completed')
                            AND updated_at >= date_trunc('month', now()))
    INTO v_signed_this_month
  FROM public.brh_agence_contributions
  WHERE agence_id = p_agence_id;

  INSERT INTO public.brh_agence_progression
    (agence_id, tier, contributions_count, contributions_qualified,
     chantiers_signes, chantiers_completes,
     total_commission_due_cents, total_commission_paid_cents,
     contribution_unlocked, stats_updated_at, updated_at)
  VALUES
    (p_agence_id, v_tier, v_count, v_qualified, v_signed, v_completed,
     v_due, v_paid, v_signed_this_month * 5, now(), now())
  ON CONFLICT (agence_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    contributions_count = EXCLUDED.contributions_count,
    contributions_qualified = EXCLUDED.contributions_qualified,
    chantiers_signes = EXCLUDED.chantiers_signes,
    chantiers_completes = EXCLUDED.chantiers_completes,
    total_commission_due_cents = EXCLUDED.total_commission_due_cents,
    total_commission_paid_cents = EXCLUDED.total_commission_paid_cents,
    contribution_unlocked = GREATEST(public.brh_agence_progression.contribution_unlocked, v_signed_this_month * 5),
    stats_updated_at = now(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.brh_agence_recompute_progression(UUID)
  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Trigger : crédite referral_unlocked à chaque commission parrainage créée
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_credit_referral_leads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- À chaque INSERT d'une commission parrainage, crédite +5 leads au parrain
  INSERT INTO public.brh_agence_progression (agence_id, referral_unlocked)
  VALUES (NEW.recruiter_agence_id, 5)
  ON CONFLICT (agence_id) DO UPDATE SET
    referral_unlocked = public.brh_agence_progression.referral_unlocked + 5,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_agence_credit_referral_leads
  ON brh_agence_referral_commissions;
CREATE TRIGGER trg_brh_agence_credit_referral_leads
  AFTER INSERT ON brh_agence_referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_credit_referral_leads();

-- ----------------------------------------------------------------------------
-- 7. Étendre social reward trigger pour écrire dans social_unlocked
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_social_reward_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_reward INT;
BEGIN
  -- Crédit lors du passage 'attente_validation' → 'validee'
  IF NEW.status = 'validee' AND OLD.status IS DISTINCT FROM 'validee' THEN
    v_reward := COALESCE(NEW.reward_leads, 5);

    INSERT INTO public.brh_agence_progression
      (agence_id, tier, social_unlocked)
    VALUES (NEW.agence_id, 'bronze', v_reward)
    ON CONFLICT (agence_id) DO UPDATE SET
      social_unlocked = public.brh_agence_progression.social_unlocked + v_reward,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- (Le trigger lui-même reste identique, on ne fait que remplacer la fonction.)

COMMIT;

-- =============================================================================
-- Sanity checks
-- =============================================================================
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'brh_agence_progression'
  AND column_name IN ('social_unlocked','contribution_unlocked','referral_unlocked','bonuses_period_start')
ORDER BY column_name;

SELECT proname FROM pg_proc
WHERE proname IN (
  'brh_get_my_lead_breakdown',
  'brh_grant_lead_claim',
  'brh_reset_agence_monthly_quotas',
  'brh_agence_recompute_progression',
  'brh_agence_credit_referral_leads',
  'brh_agence_social_reward_trigger'
)
ORDER BY proname;
