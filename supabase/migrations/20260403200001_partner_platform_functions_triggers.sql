-- Migration: Partner Platform - Fonctions SECURITY DEFINER + Triggers
-- Date: 2026-04-03

-- Helper : verifier role pro
CREATE OR REPLACE FUNCTION public.is_pro()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'pro');
$$;

-- Helper : recuperer company_id du user courant
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT company_id FROM public.brh_company_members WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- Trigger : calcul commission automatique sur brh_quotes
CREATE OR REPLACE FUNCTION public.calculate_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commission_rate_percent IS NOT NULL THEN
    NEW.commission_amount := (NEW.amount * NEW.commission_rate_percent / 100);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_commission
BEFORE INSERT OR UPDATE ON brh_quotes
FOR EACH ROW EXECUTE FUNCTION public.calculate_commission();

-- Trigger : mise a jour CA total entreprise + niveau partenaire
CREATE OR REPLACE FUNCTION public.update_company_ca()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_new_ca INTEGER;
  v_settings RECORD;
BEGIN
  SELECT company_id INTO v_company_id FROM public.brh_prospects WHERE id = NEW.prospect_id;
  IF v_company_id IS NOT NULL THEN
    UPDATE public.brh_companies
    SET total_ca_apporte = total_ca_apporte + NEW.amount,
        updated_at = NOW()
    WHERE id = v_company_id
    RETURNING total_ca_apporte INTO v_new_ca;

    SELECT * INTO v_settings FROM public.brh_platform_settings WHERE key = 'global';

    UPDATE public.brh_companies SET level = CASE
      WHEN v_new_ca >= v_settings.pro_platinum_threshold THEN 'platinum'
      WHEN v_new_ca >= v_settings.pro_gold_threshold THEN 'gold'
      WHEN v_new_ca >= v_settings.pro_silver_threshold THEN 'silver'
      ELSE 'bronze'
    END WHERE id = v_company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_ca
AFTER INSERT ON brh_quotes
FOR EACH ROW EXECUTE FUNCTION public.update_company_ca();

-- Trigger : attribution points affilie
CREATE OR REPLACE FUNCTION public.award_affiliate_points()
RETURNS TRIGGER AS $$
DECLARE
  v_affiliate_id UUID;
  v_points INTEGER;
BEGIN
  SELECT affiliate_id INTO v_affiliate_id FROM public.brh_prospects WHERE id = NEW.prospect_id;
  IF v_affiliate_id IS NOT NULL THEN
    SELECT points_per_signed_quote INTO v_points FROM public.brh_platform_settings WHERE key = 'global';
    NEW.points_awarded := v_points;
    NEW.points_awarded_at := NOW();
    UPDATE public.brh_affiliates
    SET points_balance = points_balance + v_points,
        total_points_earned = total_points_earned + v_points
    WHERE id = v_affiliate_id;
    INSERT INTO public.brh_points_transactions(affiliate_id, points, type, reference_id, description)
    VALUES (v_affiliate_id, v_points, 'parrainage', NEW.id, 'Parrainage signe');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_affiliate_points
BEFORE INSERT ON brh_quotes
FOR EACH ROW EXECUTE FUNCTION public.award_affiliate_points();

-- Trigger : calcul lead score
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.lead_score := 0;
  IF NEW.client_email IS NOT NULL AND NEW.client_email != '' THEN NEW.lead_score := NEW.lead_score + 10; END IF;
  IF NEW.estimated_budget IS NOT NULL AND NEW.estimated_budget != '' THEN NEW.lead_score := NEW.lead_score + 15; END IF;
  IF NEW.urgency = 'immediate' THEN NEW.lead_score := NEW.lead_score + 30;
  ELSIF NEW.urgency = '3mois' THEN NEW.lead_score := NEW.lead_score + 20;
  ELSIF NEW.urgency = '6mois' THEN NEW.lead_score := NEW.lead_score + 10;
  END IF;
  IF NEW.client_address IS NOT NULL AND NEW.client_address != '' THEN NEW.lead_score := NEW.lead_score + 10; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_lead_score
BEFORE INSERT OR UPDATE ON brh_prospects
FOR EACH ROW EXECUTE FUNCTION public.calculate_lead_score();

-- updated_at triggers pour les nouvelles tables
CREATE TRIGGER brh_companies_updated_at BEFORE UPDATE ON brh_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brh_prospects_updated_at BEFORE UPDATE ON brh_prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brh_quotes_updated_at BEFORE UPDATE ON brh_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brh_rewards_catalog_updated_at BEFORE UPDATE ON brh_rewards_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER brh_reward_claims_updated_at BEFORE UPDATE ON brh_reward_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
