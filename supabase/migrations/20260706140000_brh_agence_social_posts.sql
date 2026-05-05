-- =============================================================================
-- Phase 16.1 — Réseaux sociaux agence avec récompense en leads bonus
-- =============================================================================
-- Calque le système Pro (brh_social_posts) mais récompense en LEADS bonus
-- (et non en points/euros). Workflow : agence partage 2 publications/mois
-- validées → +5 leads bonus crédités dans brh_agence_progression.
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

CREATE TABLE IF NOT EXISTS brh_agence_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id UUID NOT NULL REFERENCES brh_agences_immo(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  platform TEXT NOT NULL
    CHECK (platform IN ('facebook','instagram','linkedin','tiktok','google_business')),
  post_type TEXT NOT NULL DEFAULT 'post'
    CHECK (post_type IN ('post','video','article','review')),
  post_url TEXT NOT NULL,
  screenshot_path TEXT,
  description TEXT,

  -- Récompense en leads bonus (PAS en points/euros — on est sur le quota agence)
  reward_leads INTEGER NOT NULL DEFAULT 5,
  rewarded_at TIMESTAMPTZ,

  status TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (status IN ('en_attente','en_cours_verification','validee','refusee','expiree')),
  rejection_reason TEXT,
  validated_at TIMESTAMPTZ,
  expiry_check_date DATE,
  expiry_confirmed BOOLEAN DEFAULT FALSE,

  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brh_agence_social_url
  ON brh_agence_social_posts(post_url) WHERE status <> 'refusee';
CREATE INDEX IF NOT EXISTS brh_agence_social_agence
  ON brh_agence_social_posts(agence_id, created_at DESC);
CREATE INDEX IF NOT EXISTS brh_agence_social_status
  ON brh_agence_social_posts(status);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_brh_agence_social_updated ON brh_agence_social_posts;
CREATE TRIGGER trg_brh_agence_social_updated
  BEFORE UPDATE ON brh_agence_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.brh_refonte_set_updated_at();

-- Trigger : à la validation (status → 'validee'), créditer +N leads bonus
-- dans brh_agence_progression.bonus_leads_unlocked et marquer rewarded_at.
CREATE OR REPLACE FUNCTION public.brh_agence_social_reward_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Crédit uniquement à la transition vers 'validee' et si pas déjà rewarded
  IF NEW.status = 'validee' AND OLD.status <> 'validee' AND NEW.rewarded_at IS NULL THEN
    -- Marquer la récompense
    NEW.rewarded_at := now();

    -- Créditer les leads bonus dans la progression
    INSERT INTO public.brh_agence_progression (agence_id, tier, bonus_leads_unlocked)
    VALUES (NEW.agence_id, 'bronze', NEW.reward_leads)
    ON CONFLICT (agence_id) DO UPDATE
      SET bonus_leads_unlocked = public.brh_agence_progression.bonus_leads_unlocked + NEW.reward_leads,
          updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brh_agence_social_reward ON brh_agence_social_posts;
CREATE TRIGGER trg_brh_agence_social_reward
  BEFORE UPDATE ON brh_agence_social_posts
  FOR EACH ROW EXECUTE FUNCTION public.brh_agence_social_reward_trigger()
;

-- RLS
ALTER TABLE brh_agence_social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_agence_select ON brh_agence_social_posts;
CREATE POLICY social_agence_select ON brh_agence_social_posts
  FOR SELECT TO authenticated
  USING (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS social_agence_insert ON brh_agence_social_posts;
CREATE POLICY social_agence_insert ON brh_agence_social_posts
  FOR INSERT TO authenticated
  WITH CHECK (
    agence_id IN (
      SELECT agence_id FROM public.brh_partner_contracts
      WHERE signer_profile_id = auth.uid()
        AND partner_type = 'agence_immo' AND status = 'active'
    )
  );

DROP POLICY IF EXISTS social_admin_all ON brh_agence_social_posts;
CREATE POLICY social_admin_all ON brh_agence_social_posts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

COMMIT;

SELECT 'brh_agence_social_posts created with +leads reward trigger' AS status;
