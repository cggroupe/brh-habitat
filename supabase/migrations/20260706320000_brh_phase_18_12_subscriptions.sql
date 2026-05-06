-- =============================================================================
-- Phase 18.12 — Monétisation V2 : abonnements Pro Premium réseau
-- =============================================================================
--
-- Table `brh_reseau_subscriptions` pour tracker les abonnements Stripe Pro Premium
-- du portail réseau (19€/mois) + flag `is_featured` sur partner_contracts (49€/mois
-- featured profile en V2 — V1 = booléen seulement, gating Stripe en V2).
--
-- Conformité 14 règles anti-bug :
--   #2 BIGINT cents pour les montants
--   #11 TIMESTAMPTZ partout
--   #12 SET search_path = '' sur fonctions SECURITY DEFINER
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- 1. Table abonnements réseau Pro Premium
CREATE TABLE IF NOT EXISTS brh_reseau_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'brh'
    CHECK (tenant_id IN ('brh','idf','paca','autaf')),

  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pro_id UUID REFERENCES brh_partner_contracts(id) ON DELETE SET NULL,

  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free','premium','featured','enterprise')),

  -- Stripe references (NULL pour tier 'free')
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  stripe_status TEXT
    CHECK (stripe_status IS NULL OR stripe_status IN (
      'active','past_due','unpaid','canceled','incomplete','incomplete_expired',
      'trialing','paused'
    )),

  -- Période courante
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,

  -- Montant snapshot pour audit (au cas où prix change)
  amount_cents BIGINT,
  currency TEXT DEFAULT 'EUR',

  -- Avantages débloqués (cache JSONB pour UI rapide)
  benefits JSONB DEFAULT '{}',
    -- ex: { "boost_feed": true, "stats_advanced": true, "posts_per_day": 20, "no_ads": true }

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id)  -- 1 abonnement actif par profil
);

CREATE INDEX IF NOT EXISTS brh_reseau_sub_pro
  ON brh_reseau_subscriptions(pro_id) WHERE pro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_reseau_sub_tier
  ON brh_reseau_subscriptions(tier) WHERE tier <> 'free';
CREATE INDEX IF NOT EXISTS brh_reseau_sub_stripe_sub
  ON brh_reseau_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

COMMENT ON TABLE brh_reseau_subscriptions IS
  'Phase 18.12 — abonnements Pro Premium réseau (19€/mois Premium, 49€/mois Featured V2). 1:1 par profile_id.';

-- 2. RLS owner-only + admin
ALTER TABLE brh_reseau_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reseau_sub_owner_select ON brh_reseau_subscriptions;
CREATE POLICY reseau_sub_owner_select ON brh_reseau_subscriptions
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS reseau_sub_owner_insert ON brh_reseau_subscriptions;
CREATE POLICY reseau_sub_owner_insert ON brh_reseau_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS reseau_sub_admin_all ON brh_reseau_subscriptions;
CREATE POLICY reseau_sub_admin_all ON brh_reseau_subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 3. updated_at auto
DROP TRIGGER IF EXISTS trg_brh_reseau_sub_updated ON brh_reseau_subscriptions;
CREATE TRIGGER trg_brh_reseau_sub_updated
  BEFORE UPDATE ON brh_reseau_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- 4. Flag is_featured sur brh_partner_contracts (Featured Profile 49€/mois — V2 gated par tier='featured')
ALTER TABLE brh_partner_contracts
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS brh_partner_contracts_featured
  ON brh_partner_contracts(is_featured) WHERE is_featured = TRUE;

COMMENT ON COLUMN brh_partner_contracts.is_featured IS
  'Phase 18.12 — Featured Profile (49€/mois en V2). V1 toggle admin uniquement, V2 gated par brh_reseau_subscriptions.tier=''featured''.';

-- 5. Helper SECURITY DEFINER : tier d'abonnement du user courant
CREATE OR REPLACE FUNCTION public.brh_user_reseau_tier()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (SELECT tier FROM public.brh_reseau_subscriptions
     WHERE profile_id = auth.uid()
       AND (stripe_status IS NULL OR stripe_status = 'active')
     LIMIT 1),
    'free'
  );
$$;

GRANT EXECUTE ON FUNCTION public.brh_user_reseau_tier() TO authenticated, service_role;

COMMENT ON FUNCTION public.brh_user_reseau_tier() IS
  'Phase 18.12 — tier abonnement réseau du user courant (free/premium/featured/enterprise). Utilisable côté front pour gating UI.';

-- 6. Init free pour tous les pros existants
INSERT INTO brh_reseau_subscriptions (profile_id, pro_id, tier)
SELECT DISTINCT ON (pc.signer_profile_id)
  pc.signer_profile_id,
  pc.id,
  'free'
FROM brh_partner_contracts pc
WHERE pc.signer_profile_id IS NOT NULL
  AND pc.status = 'active'
ORDER BY pc.signer_profile_id, pc.signed_at DESC
ON CONFLICT (profile_id) DO NOTHING;

COMMIT;

-- Vérification
SELECT tier, count(*) FROM brh_reseau_subscriptions GROUP BY tier;
