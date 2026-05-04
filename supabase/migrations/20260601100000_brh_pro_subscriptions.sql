-- Migration Phase 15 — SaaS tier + quota courriers IA pour pros RGE
-- Distinct du pricing agences immo (score-vente-amelioration-pre-build.md Phase 12).
-- Référence wiki : tenant-multitenancy.md (feature flags par tier statique → désormais dynamique par profile).

-- ============================================================================
-- brh_pro_subscriptions — 1 row par profile pro RGE
-- ============================================================================
CREATE TABLE brh_pro_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,

  -- Tier + features
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'expert')),

  -- Quotas mensuels (par tier — voir tier-presets côté front)
  quota_letters_per_month INTEGER NOT NULL DEFAULT 5,
  letters_used_this_period INTEGER NOT NULL DEFAULT 0,

  -- Période de quota (resetée mensuellement par trigger ou app logic)
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),

  -- Stripe (nullable — populé après checkout)
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  stripe_status TEXT CHECK (stripe_status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', NULL)),

  -- Cancellation
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- Méta
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX brh_pro_subs_tier ON brh_pro_subscriptions(tier);
CREATE INDEX brh_pro_subs_stripe_sub ON brh_pro_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX brh_pro_subs_period ON brh_pro_subscriptions(current_period_end);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION brh_pro_subs_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER brh_pro_subs_updated_at
  BEFORE UPDATE ON brh_pro_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION brh_pro_subs_set_updated_at();

-- ============================================================================
-- Helper SQL : reset quota + accorder un courrier (atomicité côté DB)
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_consume_letter_quota(p_profile_id UUID)
RETURNS TABLE(allowed BOOLEAN, tier TEXT, used INTEGER, quota INTEGER, period_end TIMESTAMPTZ)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  sub RECORD;
BEGIN
  -- Crée l'abonnement free par défaut si absent
  INSERT INTO public.brh_pro_subscriptions(profile_id)
  VALUES (p_profile_id)
  ON CONFLICT (profile_id) DO NOTHING;

  -- Reset quota si période expirée
  UPDATE public.brh_pro_subscriptions
  SET
    letters_used_this_period = 0,
    current_period_start = now(),
    current_period_end = now() + INTERVAL '1 month'
  WHERE profile_id = p_profile_id
    AND current_period_end < now();

  -- Charge le sub
  SELECT * INTO sub FROM public.brh_pro_subscriptions WHERE profile_id = p_profile_id FOR UPDATE;

  -- Refus si quota dépassé
  IF sub.letters_used_this_period >= sub.quota_letters_per_month THEN
    RETURN QUERY SELECT false, sub.tier, sub.letters_used_this_period, sub.quota_letters_per_month, sub.current_period_end;
    RETURN;
  END IF;

  -- Incrément + retour OK
  UPDATE public.brh_pro_subscriptions
  SET letters_used_this_period = letters_used_this_period + 1
  WHERE profile_id = p_profile_id;

  RETURN QUERY SELECT true, sub.tier, sub.letters_used_this_period + 1, sub.quota_letters_per_month, sub.current_period_end;
END;
$$;

COMMENT ON FUNCTION brh_consume_letter_quota IS
  'Consomme atomiquement 1 courrier IA du quota mensuel du pro. Auto-crée le sub free si absent. Auto-reset si période expirée. Renvoie allowed=false si quota dépassé.';

-- ============================================================================
-- RLS — pro voit son propre sub uniquement
-- ============================================================================
ALTER TABLE brh_pro_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_select_own_sub" ON brh_pro_subscriptions FOR SELECT
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Insert/update via service_role (Stripe webhook / EF generate-prospect-letter)
-- Pas de policy WITH CHECK pour authenticated → seul service_role peut écrire.
-- L'admin peut tout faire via la policy admin existante (cohérence avec le projet).
CREATE POLICY "admin_all_sub" ON brh_pro_subscriptions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE brh_pro_subscriptions IS
  'Abonnement SaaS pro RGE — Phase 15. Tier free/pro/expert, quota courriers IA mensuel auto-reset, Stripe IDs. Distinct du pricing agences immo (Phase 12). 1 row par profile.';
