-- =============================================================================
-- Phase 16.1 — RPC brh_grant_lead_claim retourne aussi la source consommée
-- =============================================================================
--
-- Avant : retournait juste UUID (assignment_id). L'UI ne savait pas si le
-- claim a tapé sur le tier ou sur quel bonus.
--
-- Après : retourne TABLE(assignment_id, consumed_from) pour qu'un toast UI
-- puisse afficher "Lead consommé via ton bonus contribution" et inciter
-- l'agence à comprendre comment ses bonus se débloquent.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. DROP + recreate avec nouvelle signature
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.brh_grant_lead_claim(UUID, BIGINT);

CREATE OR REPLACE FUNCTION public.brh_grant_lead_claim(
  p_agence_id UUID,
  p_prospect_id BIGINT
)
RETURNS TABLE (
  assignment_id UUID,
  consumed_from TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sub_id UUID;
  v_quota INTEGER;
  v_used INTEGER;
  v_tier_remaining INTEGER;
  v_progression_exists BOOLEAN;
  v_social_left INTEGER;
  v_contrib_left INTEGER;
  v_referral_left INTEGER;
  v_assignment_id UUID;
  v_source TEXT;
BEGIN
  SELECT id, monthly_lead_quota, current_month_claims
    INTO v_sub_id, v_quota, v_used
  FROM public.brh_agence_subscriptions
  WHERE agence_id = p_agence_id
  FOR UPDATE;

  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'no_active_subscription'
      USING ERRCODE = 'P0002',
            HINT = 'Aucun abonnement actif pour cette agence.';
  END IF;

  IF v_quota IS NULL THEN
    v_tier_remaining := -1;
  ELSE
    v_tier_remaining := GREATEST(0, v_quota - v_used);
  END IF;

  SELECT TRUE INTO v_progression_exists
  FROM public.brh_agence_progression
  WHERE agence_id = p_agence_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_progression_exists := FALSE;
    v_social_left := 0;
    v_contrib_left := 0;
    v_referral_left := 0;
  ELSE
    SELECT
      social_unlocked - social_consumed,
      contribution_unlocked - contribution_consumed,
      referral_unlocked - referral_consumed
      INTO v_social_left, v_contrib_left, v_referral_left
    FROM public.brh_agence_progression
    WHERE agence_id = p_agence_id;
  END IF;

  IF v_tier_remaining = 0
     AND v_social_left = 0
     AND v_contrib_left = 0
     AND v_referral_left = 0 THEN
    RAISE EXCEPTION 'quota_exhausted'
      USING ERRCODE = '53400',
            HINT = 'Quota mensuel atteint. Aucun lead bonus disponible.';
  END IF;

  INSERT INTO public.brh_lead_assignments (prospect_id, agence_id, status)
  VALUES (p_prospect_id, p_agence_id, 'active')
  RETURNING id INTO v_assignment_id;

  -- Décrémentation par priorité : tier > contribution > referral > social
  IF v_tier_remaining = -1 OR v_tier_remaining > 0 THEN
    UPDATE public.brh_agence_subscriptions
    SET current_month_claims = current_month_claims + 1,
        updated_at = now()
    WHERE id = v_sub_id;
    v_source := 'tier';

  ELSIF v_contrib_left > 0 THEN
    UPDATE public.brh_agence_progression
    SET contribution_consumed = contribution_consumed + 1,
        bonus_leads_consumed = bonus_leads_consumed + 1,
        updated_at = now()
    WHERE agence_id = p_agence_id;
    v_source := 'contribution';

  ELSIF v_referral_left > 0 THEN
    UPDATE public.brh_agence_progression
    SET referral_consumed = referral_consumed + 1,
        bonus_leads_consumed = bonus_leads_consumed + 1,
        updated_at = now()
    WHERE agence_id = p_agence_id;
    v_source := 'referral';

  ELSIF v_social_left > 0 THEN
    UPDATE public.brh_agence_progression
    SET social_consumed = social_consumed + 1,
        bonus_leads_consumed = bonus_leads_consumed + 1,
        updated_at = now()
    WHERE agence_id = p_agence_id;
    v_source := 'social';
  END IF;

  RETURN QUERY SELECT v_assignment_id, v_source;
END;
$$;

COMMENT ON FUNCTION public.brh_grant_lead_claim IS
  'Phase 16.1 — claim atomique avec consommation prioritaire tier > contribution > referral > social. '
  'Retourne TABLE(assignment_id, consumed_from) pour UX claire côté UI.';

GRANT EXECUTE ON FUNCTION public.brh_grant_lead_claim(UUID, BIGINT) TO authenticated;

COMMIT;

-- =============================================================================
-- Sanity
-- =============================================================================
SELECT proname, pg_get_function_result(oid) AS return_type
FROM pg_proc
WHERE proname = 'brh_grant_lead_claim';
