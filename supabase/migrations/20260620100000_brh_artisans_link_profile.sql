-- Migration Phase 13.6.4 — Lier artisans RGE à leur compte profile (vue inverse dashboard)
-- Permet à l'artisan de voir ses leads + accept/decline depuis son espace BRH.
-- Phase 13.6.5 livrera le magic link onboarding (pas de password).

-- ============================================================================
-- ALTER brh_artisans_rge — colonne profile_id (artisan ↔ compte BRH)
-- ============================================================================
ALTER TABLE brh_artisans_rge
  ADD COLUMN profile_id UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX brh_artisans_profile ON brh_artisans_rge(profile_id) WHERE profile_id IS NOT NULL;

COMMENT ON COLUMN brh_artisans_rge.profile_id IS
  'FK vers profiles.id si l''artisan a créé un compte BRH (Phase 13.6.4). NULL = artisan importé depuis annuaire RGE ADEME mais pas encore onboardé.';

-- ============================================================================
-- RLS — artisan voit son propre profil + ses leads
-- ============================================================================

-- Artisan peut voir/modifier sa propre fiche
CREATE POLICY "artisan_select_own_profile" ON brh_artisans_rge FOR SELECT
  TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "artisan_update_own_profile" ON brh_artisans_rge FOR UPDATE
  TO authenticated
  USING (profile_id = auth.uid());

-- Artisan voit les leads où artisan_id matche sa fiche
CREATE POLICY "artisan_select_own_leads" ON brh_artisan_leads FOR SELECT
  TO authenticated
  USING (
    artisan_id IN (
      SELECT id FROM brh_artisans_rge WHERE profile_id = auth.uid()
    )
  );

-- Artisan peut update le status de ses propres leads (accept/decline/quote/sign)
CREATE POLICY "artisan_update_own_leads" ON brh_artisan_leads FOR UPDATE
  TO authenticated
  USING (
    artisan_id IN (
      SELECT id FROM brh_artisans_rge WHERE profile_id = auth.uid()
    )
  );

-- ============================================================================
-- Helper SQL : update statut lead côté artisan + recalcul score
-- ============================================================================
CREATE OR REPLACE FUNCTION brh_artisan_respond_lead(
  p_lead_id UUID,
  p_action TEXT,
  p_reason TEXT DEFAULT NULL,
  p_actual_chantier_eur NUMERIC DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_status TEXT, message TEXT)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_artisan_id UUID;
  v_caller_id UUID;
  v_caller_artisan_profile UUID;
  v_new_status TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Auth requise'::TEXT;
    RETURN;
  END IF;

  -- Récupère artisan_id du lead
  SELECT artisan_id INTO v_artisan_id FROM public.brh_artisan_leads WHERE id = p_lead_id;
  IF v_artisan_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Lead introuvable'::TEXT;
    RETURN;
  END IF;

  -- Vérifie que le caller est bien l'artisan en question
  SELECT profile_id INTO v_caller_artisan_profile FROM public.brh_artisans_rge WHERE id = v_artisan_id;
  IF v_caller_artisan_profile IS NULL OR v_caller_artisan_profile <> v_caller_id THEN
    RETURN QUERY SELECT false, NULL::TEXT, 'Non autorisé'::TEXT;
    RETURN;
  END IF;

  -- Mappe l'action vers status
  v_new_status := CASE p_action
    WHEN 'accept' THEN 'accepted'
    WHEN 'decline' THEN 'declined'
    WHEN 'quote' THEN 'quoted'
    WHEN 'sign' THEN 'signed'
    WHEN 'complete' THEN 'completed'
    WHEN 'cancel' THEN 'canceled'
    ELSE NULL
  END;

  IF v_new_status IS NULL THEN
    RETURN QUERY SELECT false, NULL::TEXT, format('Action inconnue: %s', p_action);
    RETURN;
  END IF;

  -- Update le lead avec timestamp approprié
  UPDATE public.brh_artisan_leads
  SET
    status = v_new_status,
    status_reason = COALESCE(p_reason, status_reason),
    responded_at = CASE
      WHEN p_action IN ('accept', 'decline') THEN now()
      ELSE responded_at
    END,
    signed_at = CASE WHEN p_action = 'sign' THEN now() ELSE signed_at END,
    completed_at = CASE WHEN p_action = 'complete' THEN now() ELSE completed_at END,
    actual_chantier_ttc_eur = COALESCE(p_actual_chantier_eur, actual_chantier_ttc_eur)
  WHERE id = p_lead_id;

  -- Recalcule le score qualité de l'artisan (cf. Phase 13.6 helper)
  PERFORM public.brh_update_artisan_score(v_artisan_id);

  RETURN QUERY SELECT true, v_new_status, 'OK'::TEXT;
END;
$$;

COMMENT ON FUNCTION brh_artisan_respond_lead IS
  'Action de l''artisan sur un de ses leads (accept/decline/quote/sign/complete/cancel). Vérifie l''auth + recalcule score qualité automatiquement.';
