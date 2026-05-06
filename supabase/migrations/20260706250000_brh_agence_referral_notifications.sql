-- =============================================================================
-- Phase 16.1 — Notification automatique au parrain quand commission créée
-- =============================================================================
--
-- À chaque INSERT dans brh_agence_referral_commissions, le signer de l'agence
-- parrain reçoit une notification dans brh_notifications (visible via la
-- cloche NotificationBell + Realtime déjà actif).
--
-- Type notification : 'agence_referral_earned'
-- Body adapté au niveau (1 = parrain direct, 2-5 = via cascade).
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE OR REPLACE FUNCTION public.brh_agence_referral_notify_recruiter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_signer UUID;
  v_recruited_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_amount_eur INTEGER;
BEGIN
  -- Trouve le signer (utilisateur principal) de l'agence parrain
  SELECT signer_profile_id INTO v_signer
  FROM public.brh_partner_contracts
  WHERE agence_id = NEW.recruiter_agence_id
    AND partner_type = 'agence_immo'
    AND status = 'active'
  LIMIT 1;

  IF v_signer IS NULL THEN
    RETURN NEW; -- pas de signer actif, on ne notifie pas
  END IF;

  SELECT raison_sociale INTO v_recruited_name
  FROM public.brh_agences_immo
  WHERE id = NEW.recruited_agence_id;

  v_amount_eur := NEW.commission_amount_cents / 100;

  IF NEW.chain_level = 1 THEN
    v_title := '🎉 Charte parrainée signée';
    v_body := format('%s vient de signer sa charte. Vous gagnez %s € HT + %s leads bonus.',
      COALESCE(v_recruited_name, 'Une agence parrainée'),
      v_amount_eur, NEW.leads_bonus_amount);
  ELSE
    v_title := format('💎 Commission niveau %s', NEW.chain_level);
    v_body := format('%s (filleul niveau %s) vient de signer. Vous gagnez %s € HT + %s leads bonus via la cascade.',
      COALESCE(v_recruited_name, 'Une agence'),
      NEW.chain_level, v_amount_eur, NEW.leads_bonus_amount);
  END IF;

  INSERT INTO public.brh_notifications
    (recipient_id, type, title, body, reference_type, reference_id)
  VALUES
    (v_signer, 'agence_referral_earned', v_title, v_body,
     'brh_agence_referral_commissions', NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_agence_referral_notify
  ON brh_agence_referral_commissions;
CREATE TRIGGER trg_brh_agence_referral_notify
  AFTER INSERT ON brh_agence_referral_commissions
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_referral_notify_recruiter();

COMMENT ON FUNCTION public.brh_agence_referral_notify_recruiter IS
  'Phase 16.1 — notifie le signer de l''agence parrain à chaque commission créée. '
  'Realtime déjà actif sur brh_notifications côté NotificationBell.';

COMMIT;

SELECT proname FROM pg_proc WHERE proname = 'brh_agence_referral_notify_recruiter';
