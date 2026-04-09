-- Migration: Systeme de recrutement partenaires (1 niveau)
-- Date: 2026-04-03
-- Un partenaire (pro ou particulier) peut recruter d'autres partenaires
-- et toucher 2.5% sur les gains de ses recrues

-- ============================================================
-- Colonnes recruited_by sur affiliates et companies
-- ============================================================
ALTER TABLE brh_affiliates ADD COLUMN IF NOT EXISTS recruited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE brh_companies ADD COLUMN IF NOT EXISTS recruited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index pour retrouver les recrues d'un recruteur
CREATE INDEX IF NOT EXISTS idx_brh_affiliates_recruited_by ON brh_affiliates(recruited_by) WHERE recruited_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_brh_companies_recruited_by ON brh_companies(recruited_by) WHERE recruited_by IS NOT NULL;

-- ============================================================
-- Table commissions de recrutement
-- ============================================================
CREATE TABLE brh_recruitment_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  recruited_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('commission_pro', 'points_particulier')),
  -- Montant source (ce que la recrue a gagne)
  source_amount INTEGER NOT NULL, -- en centimes (commission pro) ou en points (particulier)
  -- Commission du recruteur (2.5% par defaut)
  commission_rate_percent INTEGER NOT NULL DEFAULT 250, -- 250 = 2.50% (en basis points x100)
  commission_amount INTEGER NOT NULL, -- en centimes ou points selon source_type
  -- Reference
  reference_id UUID, -- quote_id ou points_transaction_id
  -- Statut
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'validee', 'versee')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_brh_recruitment_commissions_recruiter ON brh_recruitment_commissions(recruiter_id);
CREATE INDEX idx_brh_recruitment_commissions_recruited ON brh_recruitment_commissions(recruited_id);

-- ============================================================
-- Setting : taux de commission recrutement (configurable admin)
-- ============================================================
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS recruitment_commission_percent INTEGER DEFAULT 250;
-- 250 = 2.50% (stocke en centieme de pourcent pour precision)

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE brh_recruitment_commissions ENABLE ROW LEVEL SECURITY;

-- Le recruteur voit ses propres commissions de recrutement
CREATE POLICY "Recruteur voit ses commissions" ON brh_recruitment_commissions FOR SELECT
  USING (recruiter_id = auth.uid() OR public.is_admin());

-- Admin manage tout
CREATE POLICY "Admin manage recruitment commissions" ON brh_recruitment_commissions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- Trigger : quand un devis est signe (INSERT brh_quotes),
-- si le prospect vient d'un partenaire recrute,
-- creer une commission de recrutement pour le recruteur
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_recruitment_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_prospect RECORD;
  v_recruiter_id UUID;
  v_rate INTEGER;
  v_commission INTEGER;
BEGIN
  -- Recuperer le prospect lie au devis
  SELECT * INTO v_prospect FROM public.brh_prospects WHERE id = NEW.prospect_id;
  IF v_prospect IS NULL THEN RETURN NEW; END IF;

  -- Recuperer le taux de commission recrutement
  SELECT recruitment_commission_percent INTO v_rate FROM public.brh_platform_settings WHERE key = 'global';
  IF v_rate IS NULL OR v_rate = 0 THEN RETURN NEW; END IF;

  -- Cas 1 : prospect source PRO → verifier si l'entreprise a ete recrutee
  IF v_prospect.source_type = 'pro' AND v_prospect.company_id IS NOT NULL THEN
    SELECT recruited_by INTO v_recruiter_id FROM public.brh_companies WHERE id = v_prospect.company_id;

    IF v_recruiter_id IS NOT NULL AND NEW.commission_amount IS NOT NULL AND NEW.commission_amount > 0 THEN
      v_commission := (NEW.commission_amount * v_rate / 10000);
      INSERT INTO public.brh_recruitment_commissions
        (recruiter_id, recruited_id, source_type, source_amount, commission_rate_percent, commission_amount, reference_id)
      VALUES
        (v_recruiter_id, v_prospect.submitted_by, 'commission_pro', NEW.commission_amount, v_rate, v_commission, NEW.id);
    END IF;
  END IF;

  -- Cas 2 : prospect source PARTICULIER → verifier si l'affilie a ete recrute
  IF v_prospect.source_type = 'particulier' AND v_prospect.affiliate_id IS NOT NULL THEN
    SELECT recruited_by INTO v_recruiter_id FROM public.brh_affiliates WHERE id = v_prospect.affiliate_id;

    IF v_recruiter_id IS NOT NULL AND NEW.points_awarded IS NOT NULL AND NEW.points_awarded > 0 THEN
      -- Pour les particuliers, la commission est aussi en points (2.5% des points gagnes)
      v_commission := (NEW.points_awarded * v_rate / 10000);
      IF v_commission > 0 THEN
        INSERT INTO public.brh_recruitment_commissions
          (recruiter_id, recruited_id, source_type, source_amount, commission_rate_percent, commission_amount, reference_id)
        VALUES
          (v_recruiter_id, v_prospect.affiliate_id, 'points_particulier', NEW.points_awarded, v_rate, v_commission, NEW.id);

        -- Crediter les points au recruteur
        UPDATE public.brh_affiliates
        SET points_balance = points_balance + v_commission,
            total_points_earned = total_points_earned + v_commission
        WHERE id = v_recruiter_id;

        INSERT INTO public.brh_points_transactions
          (affiliate_id, points, type, reference_id, description)
        VALUES
          (v_recruiter_id, v_commission, 'bonus_mensuel', NEW.id, 'Commission recrutement - parrainage de votre vendeur');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_recruitment_commission
AFTER INSERT ON brh_quotes
FOR EACH ROW EXECUTE FUNCTION public.calculate_recruitment_commission();
