-- Migration: Viral Features (Phase 6)
-- Date: 2026-04-03
-- A2: Code court memorisable
-- A1: Simulation partagee + tracking
-- A6: Publications reseaux sociaux
-- A7: Cashback travaux

-- ============================================================
-- A2: Code court memorisable
-- ============================================================
ALTER TABLE brh_affiliates ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- ============================================================
-- A1: Simulation partagee + tracking
-- ============================================================
CREATE TABLE brh_simulation_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES brh_affiliates(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  work_type TEXT,
  click_count INTEGER DEFAULT 0,
  simulation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE brh_simulation_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID REFERENCES brh_simulation_shares(id) ON DELETE SET NULL,
  affiliate_id UUID REFERENCES brh_affiliates(id) ON DELETE SET NULL,
  visitor_session TEXT,
  simulation_data JSONB,
  converted_to_prospect BOOLEAN DEFAULT false,
  prospect_id UUID REFERENCES brh_prospects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- A6: Publications reseaux sociaux
-- ============================================================
CREATE TABLE brh_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
  submitter_role TEXT NOT NULL CHECK (submitter_role IN ('pro', 'particulier')),
  company_id UUID REFERENCES brh_companies(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'linkedin', 'tiktok', 'google_business')),
  post_type TEXT NOT NULL CHECK (post_type IN ('post', 'video', 'article', 'review')),
  post_url TEXT NOT NULL,
  screenshot_path TEXT NOT NULL,
  description TEXT,
  reward_amount_cents INTEGER,
  reward_points INTEGER,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('carte_cadeau', 'points')),
  status TEXT DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'en_cours_verification', 'validee', 'refusee', 'expiree')),
  rejection_reason TEXT,
  validated_at TIMESTAMPTZ,
  expiry_check_date DATE,
  expiry_confirmed BOOLEAN DEFAULT false,
  is_duplicate BOOLEAN DEFAULT false,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_brh_social_posts_url ON brh_social_posts(post_url) WHERE status != 'refusee';

-- ============================================================
-- A7: Cashback travaux — extensions reward_claims
-- ============================================================
ALTER TABLE brh_reward_claims ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE brh_reward_claims ADD COLUMN IF NOT EXISTS discount_expires_at DATE;
ALTER TABLE brh_reward_claims ADD COLUMN IF NOT EXISTS discount_used BOOLEAN DEFAULT false;
ALTER TABLE brh_reward_claims ADD COLUMN IF NOT EXISTS discount_used_at TIMESTAMPTZ;

-- ============================================================
-- A6: Settings pour grille tarifaire social
-- ============================================================
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS social_reward_facebook_post INTEGER DEFAULT 5000;
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS social_reward_instagram_post INTEGER DEFAULT 5000;
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS social_reward_linkedin_post INTEGER DEFAULT 5000;
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS social_reward_linkedin_article INTEGER DEFAULT 5000;
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS social_reward_video INTEGER DEFAULT 10000;
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS social_reward_google_review INTEGER DEFAULT 3000;
ALTER TABLE brh_platform_settings ADD COLUMN IF NOT EXISTS social_monthly_limit INTEGER DEFAULT 2;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE brh_simulation_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_simulation_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_social_posts ENABLE ROW LEVEL SECURITY;

-- Simulation shares
CREATE POLICY "Affilie voit ses shares" ON brh_simulation_shares FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Affilie cree share" ON brh_simulation_shares FOR INSERT
  WITH CHECK (affiliate_id = auth.uid());
CREATE POLICY "Admin manage shares" ON brh_simulation_shares FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Simulation leads
CREATE POLICY "Affilie voit ses leads" ON brh_simulation_leads FOR SELECT
  USING (affiliate_id = auth.uid() OR public.is_admin());
CREATE POLICY "Public insert lead" ON brh_simulation_leads FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Admin manage leads" ON brh_simulation_leads FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Social posts
CREATE POLICY "User voit ses posts" ON brh_social_posts FOR SELECT
  USING (submitted_by = auth.uid() OR public.is_admin());
CREATE POLICY "User soumet post" ON brh_social_posts FOR INSERT
  WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Admin manage posts" ON brh_social_posts FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_brh_simulation_shares_affiliate ON brh_simulation_shares(affiliate_id);
CREATE INDEX idx_brh_simulation_leads_share ON brh_simulation_leads(share_id);
CREATE INDEX idx_brh_simulation_leads_affiliate ON brh_simulation_leads(affiliate_id);
CREATE INDEX idx_brh_social_posts_submitted_by ON brh_social_posts(submitted_by);
CREATE INDEX idx_brh_social_posts_status ON brh_social_posts(status);

-- Storage bucket pour screenshots social
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-screenshots',
  'social-screenshots',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "User upload screenshot"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'social-screenshots' AND auth.uid() IS NOT NULL);

CREATE POLICY "User read own screenshot"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'social-screenshots' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admin manage screenshots"
  ON storage.objects FOR ALL
  USING (bucket_id = 'social-screenshots' AND public.is_admin());

-- Trigger updated_at
CREATE TRIGGER brh_social_posts_updated_at BEFORE UPDATE ON brh_social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- A7: Cashback — inserer les entries catalogue
-- ============================================================
INSERT INTO brh_rewards_catalog (name, type, points_required, value_cents, description, is_active, sort_order)
VALUES
  ('Bon de reduction 50 EUR travaux BRH', 'reduction_travaux', 500, 5000, 'Reduction de 50 EUR applicable sur votre prochain devis BRH', true, 100),
  ('Bon de reduction 150 EUR travaux BRH', 'reduction_travaux', 1400, 15000, 'Reduction de 150 EUR applicable sur votre prochain devis BRH', true, 101),
  ('Bon de reduction 300 EUR travaux BRH', 'reduction_travaux', 2700, 30000, 'Reduction de 300 EUR applicable sur votre prochain devis BRH', true, 102),
  ('Journee de travaux offerte', 'reduction_travaux', 5000, 50000, 'Une journee d''intervention BRH offerte (valeur ~500 EUR)', true, 103)
ON CONFLICT DO NOTHING;
