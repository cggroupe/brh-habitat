-- Migration: Batch ameliorations partenaires
-- Date: 2026-04-13

-- ============================================================
-- Badges gamification particulier
-- ============================================================
CREATE TABLE brh_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- nom icone lucide-react
  condition_type TEXT NOT NULL CHECK (condition_type IN ('parrainages_total', 'parrainages_signes', 'points_earned', 'level_reached', 'recruits_total', 'chiffrages_total')),
  condition_value INTEGER NOT NULL, -- seuil pour debloquer
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE brh_user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES brh_badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

ALTER TABLE brh_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE brh_user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges lisibles" ON brh_badges FOR SELECT USING (true);
CREATE POLICY "User voit ses badges" ON brh_user_badges FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "System cree badges" ON brh_user_badges FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "Admin manage badges" ON brh_badges FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin manage user badges" ON brh_user_badges FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX idx_brh_user_badges_user ON brh_user_badges(user_id);

-- Badges par defaut
INSERT INTO brh_badges (code, name, description, icon, condition_type, condition_value, sort_order) VALUES
  ('first_parrainage', 'Premier pas', 'Votre premier parrainage envoye', 'UserPlus', 'parrainages_total', 1, 1),
  ('five_parrainages', 'Ambassadeur actif', '5 parrainages envoyes', 'Users', 'parrainages_total', 5, 2),
  ('first_signe', 'Premier succes', 'Votre premier parrainage signe', 'Trophy', 'parrainages_signes', 1, 3),
  ('five_signes', 'Faiseur de deals', '5 parrainages signes', 'Award', 'parrainages_signes', 5, 4),
  ('hundred_points', 'Centenaire', '100 points cumules', 'Star', 'points_earned', 100, 5),
  ('five_hundred_points', 'Demi-millier', '500 points cumules', 'Gem', 'points_earned', 500, 6),
  ('first_recruit', 'Recruteur', 'Premier vendeur recrute', 'Network', 'recruits_total', 1, 7),
  ('five_recruits', 'Chef de reseau', '5 vendeurs recrutes', 'Crown', 'recruits_total', 5, 8),
  ('first_chiffrage', 'Chiffreur', 'Premier chiffrage genere', 'Calculator', 'chiffrages_total', 1, 9),
  ('ambassadeur_level', 'Niveau Ambassadeur', 'Atteint le niveau Ambassadeur', 'Medal', 'level_reached', 300, 10),
  ('expert_level', 'Niveau Expert', 'Atteint le niveau Expert', 'Shield', 'level_reached', 700, 11),
  ('vip_level', 'Niveau VIP', 'Atteint le niveau VIP', 'Sparkles', 'level_reached', 1500, 12);

-- ============================================================
-- Messagerie : pieces jointes + indicateur vu
-- ============================================================
ALTER TABLE brh_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE brh_messages ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- ============================================================
-- Stats par salarie (vue pour requetes rapides)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_team_stats(p_company_id UUID)
RETURNS TABLE(
  member_id UUID,
  full_name TEXT,
  prospects_count BIGINT,
  signed_count BIGINT,
  total_ca BIGINT
) AS $$
  SELECT
    cm.profile_id AS member_id,
    pr.full_name,
    COUNT(DISTINCT p.id) AS prospects_count,
    COUNT(DISTINCT p.id) FILTER (WHERE p.status IN ('signe', 'termine')) AS signed_count,
    COALESCE(SUM(q.amount) FILTER (WHERE p.status IN ('signe', 'termine')), 0) AS total_ca
  FROM public.brh_company_members cm
  JOIN public.profiles pr ON pr.id = cm.profile_id
  LEFT JOIN public.brh_prospects p ON p.submitted_by = cm.profile_id AND p.company_id = p_company_id
  LEFT JOIN public.brh_quotes q ON q.prospect_id = p.id
  WHERE cm.company_id = p_company_id
  GROUP BY cm.profile_id, pr.full_name
  ORDER BY prospects_count DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '';

-- ============================================================
-- Storage bucket pour pieces jointes messagerie
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-attachments',
  'message-attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "User upload message attachment"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "User read message attachment"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments' AND auth.uid() IS NOT NULL);
