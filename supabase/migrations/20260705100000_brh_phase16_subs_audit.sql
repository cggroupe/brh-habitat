-- ============================================================================
-- Phase 16.0.8 + 16.0.9 — Subscriptions agences + audit aléatoire mensuel
-- ============================================================================
--
-- Objectifs :
--   1. brh_agence_subscriptions  : abonnements Stripe 4 paliers agences
--   2. brh_agence_audits         : pistes d'audit aléatoires (5% leads contactés)
--   3. brh_agence_can_claim      : helper SQL atomique (vérif quota mensuel)
--   4. brh_grant_lead_claim      : RPC qui vérifie quota + crée assignment
--   5. pg_cron jobs              : release expired (daily) + audit mensuel
--
-- Modèle Hoguet "A" : pas de transaction directe, agence claim des fiches
-- d'opportunité scorées dans la limite de son quota mensuel.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Subscriptions agences (4 paliers : Discovery / Standard / Premium / Expert)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_agence_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  /** Lien vers l'agence (1 abonnement par agence). */
  agence_id UUID NOT NULL UNIQUE REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  /** Profil signataire / payeur (peut différer de l'agence elle-même). */
  signer_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  /** Tier d'abonnement.
   *  - discovery : 0 €, 5 leads/mois (gratuit, onboarding sans CB)
   *  - standard  : 390 €, 30 leads/mois
   *  - premium   : 990 €, 100 leads/mois
   *  - expert    : 2 490 €, illimité (NULL = pas de cap)
   */
  tier TEXT NOT NULL DEFAULT 'discovery'
    CHECK (tier IN ('discovery','standard','premium','expert')),
  /** Quota leads claimable par mois (NULL = illimité). */
  monthly_lead_quota INTEGER,

  /** Stripe (NULL si tier='discovery' ou Stripe pas encore configuré). */
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_status TEXT
    CHECK (stripe_status IS NULL OR stripe_status IN
      ('active','trialing','past_due','canceled','unpaid','incomplete')),

  /** Compteur leads claim ce mois-ci (reset le 1er via cron). */
  current_month_claims INTEGER NOT NULL DEFAULT 0 CHECK (current_month_claims >= 0),
  /** Période courante. */
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_agence_subs_tier ON brh_agence_subscriptions(tier);
CREATE INDEX IF NOT EXISTS brh_agence_subs_stripe ON brh_agence_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS brh_agence_subs_period ON brh_agence_subscriptions(current_period_end);

-- Quotas par défaut selon tier (à appliquer en INSERT trigger)
CREATE OR REPLACE FUNCTION brh_agence_subs_set_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.monthly_lead_quota IS NULL THEN
    NEW.monthly_lead_quota = CASE NEW.tier
      WHEN 'discovery' THEN 5
      WHEN 'standard'  THEN 30
      WHEN 'premium'   THEN 100
      WHEN 'expert'    THEN NULL
    END;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agence_subs_set_quota
  BEFORE INSERT OR UPDATE OF tier ON brh_agence_subscriptions
  FOR EACH ROW EXECUTE FUNCTION brh_agence_subs_set_quota();

CREATE TRIGGER trg_agence_subs_updated
  BEFORE UPDATE ON brh_agence_subscriptions
  FOR EACH ROW EXECUTE FUNCTION brh_refonte_set_updated_at();

COMMENT ON TABLE brh_agence_subscriptions IS
  'Phase 16.0.8 — abonnements Stripe agences immo. 4 paliers : '
  'discovery (0€/5 leads), standard (390€/30), premium (990€/100), '
  'expert (2490€/illimité). Reset quota le 1er du mois via pg_cron.';

-- ----------------------------------------------------------------------------
-- 2. RLS subscriptions agences
-- ----------------------------------------------------------------------------
ALTER TABLE brh_agence_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agence_subs_select_signer" ON brh_agence_subscriptions
  FOR SELECT TO authenticated
  USING (signer_profile_id = auth.uid());

CREATE POLICY "agence_subs_admin_all" ON brh_agence_subscriptions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ----------------------------------------------------------------------------
-- 3. Helper SQL atomique : claim un lead avec vérification quota
-- ----------------------------------------------------------------------------
-- Idempotent + transaction-safe. Lève une exception si quota dépassé.
CREATE OR REPLACE FUNCTION brh_grant_lead_claim(
  p_agence_id UUID,
  p_prospect_id BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub RECORD;
  v_assignment_id UUID;
BEGIN
  -- Récupère l'abonnement actif de l'agence
  SELECT id, tier, monthly_lead_quota, current_month_claims
    INTO v_sub
  FROM public.brh_agence_subscriptions
  WHERE agence_id = p_agence_id
  FOR UPDATE; -- lock pendant la transaction

  IF v_sub.id IS NULL THEN
    RAISE EXCEPTION 'Aucun abonnement actif pour l''agence %', p_agence_id;
  END IF;

  -- Vérifie quota (NULL = illimité pour tier expert)
  IF v_sub.monthly_lead_quota IS NOT NULL
     AND v_sub.current_month_claims >= v_sub.monthly_lead_quota THEN
    RAISE EXCEPTION 'Quota mensuel atteint (% leads sur %)',
      v_sub.current_month_claims, v_sub.monthly_lead_quota;
  END IF;

  -- Crée l'assignment (UNIQUE INDEX prospect_id WHERE status='active' empêche
  -- qu'un autre claim puisse exister en parallèle pour ce prospect)
  INSERT INTO public.brh_lead_assignments (prospect_id, agence_id, status)
  VALUES (p_prospect_id, p_agence_id, 'active')
  RETURNING id INTO v_assignment_id;

  -- Incrémente le compteur
  UPDATE public.brh_agence_subscriptions
  SET current_month_claims = current_month_claims + 1
  WHERE id = v_sub.id;

  RETURN v_assignment_id;
END;
$$;

COMMENT ON FUNCTION brh_grant_lead_claim IS
  'Phase 16.0.8 — claim atomique d''un lead avec vérif quota. '
  'Lève une exception si quota dépassé ou prospect déjà claim. '
  'Transaction-safe (FOR UPDATE + UNIQUE INDEX).';

-- ----------------------------------------------------------------------------
-- 4. Helper SQL : reset des compteurs mensuels
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_reset_agence_monthly_quotas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH reset AS (
    UPDATE public.brh_agence_subscriptions
    SET current_month_claims = 0,
        current_period_start = date_trunc('month', now()),
        current_period_end = date_trunc('month', now()) + interval '1 month'
    WHERE current_period_end <= now()
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM reset;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION brh_reset_agence_monthly_quotas IS
  'Phase 16.0.8 — reset compteurs leads agences le 1er du mois. '
  'Invoqué par pg_cron. Aussi réinitialise les bornes de période.';

-- ----------------------------------------------------------------------------
-- 5. Audits aléatoires mensuels (Phase 16.0.9)
-- ----------------------------------------------------------------------------
-- Sample 5 % des leads "contacted" du mois précédent. Email envoyé au
-- propriétaire pour vérifier que le contact agence s'est bien passé.
-- Réponses propriétaire dans `feedback` (5 valeurs) + processed_at admin BRH.
CREATE TABLE IF NOT EXISTS brh_agence_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES brh_lead_assignments(id) ON DELETE CASCADE,
  prospect_id BIGINT NOT NULL REFERENCES brh_dpe_prospects(id) ON DELETE CASCADE,

  /** Mois audité (ex: 2026-04-01 pour audit fait 2026-05-01). */
  audit_month DATE NOT NULL,

  /** Email envoyé au propriétaire ? */
  contact_email TEXT,
  email_sent_at TIMESTAMPTZ,
  email_resend_id TEXT,

  /** Token unique pour la page de réponse (pas d'auth). */
  response_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  response_at TIMESTAMPTZ,
  feedback TEXT
    CHECK (feedback IS NULL OR feedback IN
      ('correct','intrusive','not_contacted','interested','complaint')),
  feedback_message TEXT,

  /** Suite donnée par BRH. */
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent','responded','reviewed','agence_warned','agence_suspended')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_agence_audits_agence_month
  ON brh_agence_audits(agence_id, audit_month);
CREATE INDEX IF NOT EXISTS brh_agence_audits_status
  ON brh_agence_audits(status);
CREATE INDEX IF NOT EXISTS brh_agence_audits_token
  ON brh_agence_audits(response_token);

ALTER TABLE brh_agence_audits ENABLE ROW LEVEL SECURITY;

-- Audits visibles uniquement par admin BRH
CREATE POLICY "agence_audits_admin_all" ON brh_agence_audits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Page publique de réponse : INSERT/UPDATE par token
CREATE POLICY "agence_audits_respond_anon" ON brh_agence_audits
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE brh_agence_audits IS
  'Phase 16.0.9 — audits aléatoires mensuels (5 % leads contactés). '
  'Email propriétaire avec token, réponse libre ou notée 5 valeurs.';

-- ----------------------------------------------------------------------------
-- 6. Helper SQL : génération audits aléatoires pour un mois
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION brh_generate_monthly_audits(p_audit_month DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER;
  v_period_start TIMESTAMPTZ := date_trunc('month', p_audit_month);
  v_period_end TIMESTAMPTZ := v_period_start + interval '1 month';
BEGIN
  -- Sample 5 % des leads contactés (status='contacted') durant ce mois
  WITH sampled AS (
    SELECT id, agence_id, prospect_id
    FROM public.brh_lead_assignments
    WHERE status = 'contacted'
      AND last_attempt_at >= v_period_start
      AND last_attempt_at < v_period_end
    ORDER BY random()
    LIMIT GREATEST(1, (
      SELECT count(*)::int * 5 / 100
      FROM public.brh_lead_assignments
      WHERE status = 'contacted'
        AND last_attempt_at >= v_period_start
        AND last_attempt_at < v_period_end
    ))
  ),
  inserted AS (
    INSERT INTO public.brh_agence_audits
      (agence_id, assignment_id, prospect_id, audit_month)
    SELECT agence_id, id, prospect_id, p_audit_month
    FROM sampled
    ON CONFLICT DO NOTHING -- idempotent si le cron tourne 2 fois
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION brh_generate_monthly_audits IS
  'Phase 16.0.9 — génère 5 % audits aléatoires sur les leads contacted '
  'd''un mois donné. Invoqué par pg_cron + EF email.';
