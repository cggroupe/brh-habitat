-- =============================================================================
-- Phase 16.1 — Plafond mensuel par agence parrain (anti-abus cascade MLM)
-- =============================================================================
--
-- Sans cap, une agence A qui parraine 100 agences signataires en un mois
-- débloque 100 × 5 = 500 leads bonus parrainage. Au-delà, cela vide le
-- catalogue Score Vente et déséquilibre l'inventaire.
--
-- Plafond mis en place : 30 leads bonus parrainage / mois / agence parrain
-- (= 6 chartes parrainées au niveau 1 par mois, ou plus si niveaux 2-5
-- comptent moins). Si dépassé, la commission cash reste créée (audit trail
-- + paiement légitime de l'apport) MAIS les leads bonus sont écrêtés à
-- la limite restante du mois.
--
-- Constante REFERRAL_MONTHLY_CAP = 30 leads. Modifiable via
-- ALTER FUNCTION brh_agence_credit_referral_leads.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Réécrit le trigger pour appliquer le plafond mensuel
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brh_agence_credit_referral_leads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Plafond mensuel des leads parrainage par agence parrain.
  v_monthly_cap INTEGER := 30;
  v_current_unlocked INTEGER;
  v_room_left INTEGER;
  v_credit INTEGER;
BEGIN
  -- Lit l'unlocked actuel pour ce mois (reset 1er du mois côté brh_reset_agence_monthly_quotas)
  SELECT COALESCE(referral_unlocked, 0) INTO v_current_unlocked
  FROM public.brh_agence_progression
  WHERE agence_id = NEW.recruiter_agence_id;

  v_current_unlocked := COALESCE(v_current_unlocked, 0);
  v_room_left := GREATEST(0, v_monthly_cap - v_current_unlocked);

  -- Crédit écrêté à la limite restante. Si déjà au plafond → 0 leads.
  v_credit := LEAST(NEW.leads_bonus_amount, v_room_left);

  -- Si crédit > 0, on ajoute. Sinon, on n'écrit pas (économie d'IO).
  -- La commission cash reste créée dans tous les cas (la ligne brh_agence_referral_commissions
  -- est INSERT en amont par le trigger cascade ; ce trigger-ci ne fait que les leads).
  IF v_credit > 0 THEN
    INSERT INTO public.brh_agence_progression
      (agence_id, referral_unlocked)
    VALUES
      (NEW.recruiter_agence_id, v_credit)
    ON CONFLICT (agence_id) DO UPDATE SET
      referral_unlocked = public.brh_agence_progression.referral_unlocked + v_credit,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.brh_agence_credit_referral_leads IS
  'Phase 16.1 — crédite leads parrainage avec plafond mensuel (30/agence). '
  'Les leads sont écrêtés à la limite ; la commission cash reste créée '
  '(versement légitime du parrainage, peu importe le cap leads).';

COMMIT;

-- =============================================================================
-- Sanity check
-- =============================================================================
SELECT proname, prosrc LIKE '%v_monthly_cap%' AS has_cap_logic
FROM pg_proc
WHERE proname = 'brh_agence_credit_referral_leads';
