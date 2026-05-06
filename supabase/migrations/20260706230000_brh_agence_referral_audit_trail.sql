-- =============================================================================
-- Phase 16.1 — Audit trail commissions parrainage
-- =============================================================================
--
-- Trace toutes les transitions de status sur brh_agence_referral_commissions
-- (qui a validé, payé, annulé, quand, pourquoi). Append-only.
--
-- Utilité :
--   1. Détection fraude (revue admin)
--   2. Comptabilité : timeline des versements
--   3. Phase 16.2 admin BRH — UI de validation aura besoin de cette histoire
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table audit append-only
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brh_agence_referral_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES brh_agence_referral_commissions(id) ON DELETE CASCADE,

  /** Transition observée. */
  old_status TEXT,
  new_status TEXT NOT NULL,
  /** Acteur si admin agit côté Supabase auth ; NULL si trigger système (création auto). */
  actor_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  /** Raison ou note libre. */
  notes TEXT,

  /** Snapshot des montants au moment de la transition (immutable, pour comptabilité). */
  commission_amount_cents INTEGER NOT NULL,
  leads_bonus_amount INTEGER NOT NULL,
  chain_level INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brh_agence_referral_audit_commission_idx
  ON brh_agence_referral_audit(commission_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_agence_referral_audit_actor_idx
  ON brh_agence_referral_audit(actor_profile_id)
  WHERE actor_profile_id IS NOT NULL;

COMMENT ON TABLE brh_agence_referral_audit IS
  'Phase 16.1 — audit append-only des transitions de status sur '
  'brh_agence_referral_commissions. Tracé pour comptabilité + détection fraude.';

-- ----------------------------------------------------------------------------
-- 2. RLS : agence parrain voit son audit ; admin voit tout
-- ----------------------------------------------------------------------------
ALTER TABLE brh_agence_referral_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS referral_audit_select_agence ON brh_agence_referral_audit;
CREATE POLICY referral_audit_select_agence ON brh_agence_referral_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brh_agence_referral_commissions c
      WHERE c.id = commission_id
        AND public.brh_user_belongs_to_agence(c.recruiter_agence_id)
    )
  );

DROP POLICY IF EXISTS referral_audit_admin_all ON brh_agence_referral_audit;
CREATE POLICY referral_audit_admin_all ON brh_agence_referral_audit
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Pas de policy INSERT/UPDATE/DELETE pour authenticated non-admin :
-- l'écriture passe uniquement par le trigger SECURITY DEFINER ci-dessous.

-- ----------------------------------------------------------------------------
-- 3. Trigger : log automatique de chaque transition de status
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_referral_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- INSERT : log la création initiale (status='pending' généralement)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.brh_agence_referral_audit
      (commission_id, old_status, new_status, actor_profile_id, notes,
       commission_amount_cents, leads_bonus_amount, chain_level)
    VALUES
      (NEW.id, NULL, NEW.status, auth.uid(),
       'Commission créée par trigger cascade (charte parrainée signée).',
       NEW.commission_amount_cents, NEW.leads_bonus_amount, NEW.chain_level);

  -- UPDATE : log uniquement les transitions de status
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.brh_agence_referral_audit
      (commission_id, old_status, new_status, actor_profile_id, notes,
       commission_amount_cents, leads_bonus_amount, chain_level)
    VALUES
      (NEW.id, OLD.status, NEW.status, auth.uid(), NEW.notes,
       NEW.commission_amount_cents, NEW.leads_bonus_amount, NEW.chain_level);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_agence_referral_audit
  ON brh_agence_referral_commissions;
CREATE TRIGGER trg_brh_agence_referral_audit
  AFTER INSERT OR UPDATE OF status ON brh_agence_referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_referral_audit_trigger();

-- ----------------------------------------------------------------------------
-- 4. Backfill : crée une ligne audit "création initiale" pour chaque
--    commission existante au déploiement de la migration (rétroactif).
-- ----------------------------------------------------------------------------
INSERT INTO brh_agence_referral_audit
  (commission_id, old_status, new_status, actor_profile_id, notes,
   commission_amount_cents, leads_bonus_amount, chain_level, created_at)
SELECT
  c.id,
  NULL,
  c.status,
  NULL,
  'Backfill audit (migration 20260706230000) — état au déploiement.',
  c.commission_amount_cents,
  COALESCE(c.leads_bonus_amount, 5),
  COALESCE(c.chain_level, 1),
  c.created_at
FROM brh_agence_referral_commissions c
WHERE NOT EXISTS (
  SELECT 1 FROM brh_agence_referral_audit a WHERE a.commission_id = c.id
);

COMMIT;

-- =============================================================================
-- Sanity checks
-- =============================================================================
SELECT 'brh_agence_referral_audit' AS table_name, count(*) AS rows
FROM brh_agence_referral_audit;

SELECT proname FROM pg_proc WHERE proname = 'brh_agence_referral_audit_trigger';
