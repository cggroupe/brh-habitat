-- =============================================================================
-- Phase 16.1 — Parrainage entre agences (recrutement réseau)
-- =============================================================================
--
-- Une agence peut parrainer une autre agence en partageant son lien
-- d'inscription `/inscription/agence?ref=<agence_id>`. À la signature
-- de la charte par la nouvelle agence, l'agence parrain reçoit une
-- commission forfaitaire (100 € HT) — créditée en INTEGER cents
-- (règle anti-bug #2).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- 1. Colonne referred_by_agence_id sur brh_agences_immo
ALTER TABLE brh_agences_immo
  ADD COLUMN IF NOT EXISTS referred_by_agence_id UUID
    REFERENCES brh_agences_immo(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS brh_agences_immo_referrer
  ON brh_agences_immo(referred_by_agence_id)
  WHERE referred_by_agence_id IS NOT NULL;

COMMENT ON COLUMN brh_agences_immo.referred_by_agence_id IS
  'Phase 16.1 — agence parrain (lien ?ref=<id> à l''inscription).';

-- 2. Table des commissions de parrainage
CREATE TABLE IF NOT EXISTS brh_agence_referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  recruited_agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  partner_contract_id UUID REFERENCES brh_partner_contracts(id) ON DELETE SET NULL,

  commission_amount_cents BIGINT NOT NULL DEFAULT 10000, -- 100,00 €
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','validated','paid','cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(recruiter_agence_id, recruited_agence_id, partner_contract_id)
);

CREATE INDEX IF NOT EXISTS brh_agence_ref_recruiter
  ON brh_agence_referral_commissions(recruiter_agence_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_agence_ref_status
  ON brh_agence_referral_commissions(status);

COMMENT ON TABLE brh_agence_referral_commissions IS
  'Phase 16.1 — commissions parrainage agence (forfait 100 € HT par charte signée). Status pending → validated → paid.';

-- 3. Trigger : à la signature d'une charte agence (status='active' sur
--    brh_partner_contracts pour partner_type='agence_immo'), créer une
--    commission pending pour l'agence parrain si referred_by_agence_id existe.
CREATE OR REPLACE FUNCTION public.brh_agence_referral_commission_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recruiter UUID;
BEGIN
  -- Seulement à la transition vers 'active'
  IF NEW.status = 'active' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'active')
     AND NEW.partner_type = 'agence_immo' AND NEW.agence_id IS NOT NULL THEN

    SELECT referred_by_agence_id INTO v_recruiter
    FROM public.brh_agences_immo
    WHERE id = NEW.agence_id;

    IF v_recruiter IS NOT NULL AND v_recruiter <> NEW.agence_id THEN
      INSERT INTO public.brh_agence_referral_commissions
        (recruiter_agence_id, recruited_agence_id, partner_contract_id, commission_amount_cents, status)
      VALUES
        (v_recruiter, NEW.agence_id, NEW.id, 10000, 'pending')
      ON CONFLICT (recruiter_agence_id, recruited_agence_id, partner_contract_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_agence_referral_commission
  ON brh_partner_contracts;
CREATE TRIGGER trg_brh_agence_referral_commission
  AFTER INSERT OR UPDATE ON brh_partner_contracts
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_referral_commission_trigger();

-- 4. Updated_at
DROP TRIGGER IF EXISTS trg_brh_agence_ref_updated ON brh_agence_referral_commissions;
CREATE TRIGGER trg_brh_agence_ref_updated
  BEFORE UPDATE ON brh_agence_referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- 5. RLS
ALTER TABLE brh_agence_referral_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ref_agence_select ON brh_agence_referral_commissions;
CREATE POLICY ref_agence_select ON brh_agence_referral_commissions
  FOR SELECT TO authenticated
  USING (
    recruiter_agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS ref_admin_all ON brh_agence_referral_commissions;
CREATE POLICY ref_admin_all ON brh_agence_referral_commissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 6. Étendre RLS brh_agences_immo : agence parrain peut voir les agences qu'elle a parrainées
DROP POLICY IF EXISTS agences_immo_select_referred ON brh_agences_immo;
CREATE POLICY agences_immo_select_referred ON brh_agences_immo
  FOR SELECT TO authenticated
  USING (
    referred_by_agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo'
        AND status = 'active'
    )
  );

COMMIT;

SELECT 'brh_agence_referral_commissions created' AS status;
