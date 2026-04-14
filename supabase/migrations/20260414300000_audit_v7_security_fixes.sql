-- Migration v7: Security fixes from Chaos Monkey audit 2026-04-14
-- Fixes: M3 (simulation_leads INSERT), M4 (triggers search_path), M5 (commission rounding)

-- ============================================================================
-- M3: Restreindre brh_simulation_leads INSERT aux users authentifies
-- ============================================================================
DROP POLICY IF EXISTS "Public insert lead" ON brh_simulation_leads;
CREATE POLICY "Authenticated insert lead" ON brh_simulation_leads
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- M4: Ajouter SET search_path = '' sur les trigger functions
-- ============================================================================

-- calculate_commission
CREATE OR REPLACE FUNCTION calculate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.commission_rate_percent IS NOT NULL AND NEW.amount IS NOT NULL THEN
    NEW.commission_amount := ROUND(NEW.amount::NUMERIC * NEW.commission_rate_percent / 100)::INTEGER;
  END IF;
  RETURN NEW;
END;
$$;

-- update_company_ca
CREATE OR REPLACE FUNCTION update_company_ca()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  SELECT p.company_id INTO v_company_id
  FROM public.brh_prospects p
  WHERE p.id = NEW.prospect_id;

  IF v_company_id IS NOT NULL THEN
    UPDATE public.brh_companies
    SET total_ca_apporte = total_ca_apporte + NEW.amount,
        updated_at = NOW()
    WHERE id = v_company_id;
  END IF;
  RETURN NEW;
END;
$$;

-- award_affiliate_points
CREATE OR REPLACE FUNCTION award_affiliate_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_affiliate_id UUID;
  v_points INTEGER;
BEGIN
  SELECT p.affiliate_id INTO v_affiliate_id
  FROM public.brh_prospects p
  WHERE p.id = NEW.prospect_id;

  IF v_affiliate_id IS NOT NULL THEN
    SELECT s.points_per_signed_quote INTO v_points
    FROM public.brh_platform_settings s
    LIMIT 1;

    v_points := COALESCE(v_points, 100);

    UPDATE public.brh_affiliates
    SET points_balance = points_balance + v_points,
        total_points_earned = total_points_earned + v_points
    WHERE id = v_affiliate_id;

    INSERT INTO public.brh_points_transactions (affiliate_id, points, type, reference_id, description)
    VALUES (v_affiliate_id, v_points, 'parrainage', NEW.id, 'Points devis signe');

    NEW.points_awarded := v_points;
    NEW.points_awarded_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

-- calculate_lead_score
CREATE OR REPLACE FUNCTION calculate_lead_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.lead_score := 0;

  IF NEW.client_email IS NOT NULL AND NEW.client_email != '' THEN
    NEW.lead_score := NEW.lead_score + 20;
  END IF;

  IF NEW.client_address IS NOT NULL AND NEW.client_address != '' THEN
    NEW.lead_score := NEW.lead_score + 15;
  END IF;

  IF NEW.estimated_budget IS NOT NULL AND NEW.estimated_budget > 0 THEN
    NEW.lead_score := NEW.lead_score + 15;
  END IF;

  IF NEW.work_type IS NOT NULL AND array_length(NEW.work_type, 1) > 0 THEN
    NEW.lead_score := NEW.lead_score + 10;
  END IF;

  IF NEW.urgency = 'immediate' THEN
    NEW.lead_score := NEW.lead_score + 25;
  ELSIF NEW.urgency = '3mois' THEN
    NEW.lead_score := NEW.lead_score + 15;
  ELSIF NEW.urgency = '6mois' THEN
    NEW.lead_score := NEW.lead_score + 5;
  END IF;

  RETURN NEW;
END;
$$;

-- update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- M6: Contraintes CHECK sur brh_contacts
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brh_contacts_message_length'
  ) THEN
    ALTER TABLE public.brh_contacts ADD CONSTRAINT brh_contacts_message_length CHECK (char_length(message) <= 5000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brh_contacts_email_length'
  ) THEN
    ALTER TABLE public.brh_contacts ADD CONSTRAINT brh_contacts_email_length CHECK (char_length(email) <= 320);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brh_contacts_telephone_length'
  ) THEN
    ALTER TABLE public.brh_contacts ADD CONSTRAINT brh_contacts_telephone_length CHECK (char_length(telephone) <= 30);
  END IF;
END $$;
