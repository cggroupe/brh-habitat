-- Migration: Fix bugs QA (14 bugs identifies)
-- Date: 2026-04-03

-- ============================================================
-- Bug 8: recruiter_id NOT NULL + ON DELETE SET NULL = contradiction
-- ============================================================
ALTER TABLE brh_recruitment_commissions ALTER COLUMN recruiter_id DROP NOT NULL;
ALTER TABLE brh_recruitment_commissions ALTER COLUMN recruited_id DROP NOT NULL;

-- ============================================================
-- Bug 14: RLS brh_social_posts INSERT sans WITH CHECK sur submitted_by
-- ============================================================
DROP POLICY IF EXISTS "User soumet post" ON brh_social_posts;
CREATE POLICY "User soumet post" ON brh_social_posts FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- ============================================================
-- Bug 9: brh_platform_settings lisible par tous les authentifies
-- ============================================================
DROP POLICY IF EXISTS "Settings lisibles" ON brh_platform_settings;
CREATE POLICY "Settings lisibles" ON brh_platform_settings FOR SELECT
  USING (public.is_admin());

-- ============================================================
-- Bug 6: inviteMember impossible car RLS profiles bloque SELECT par email
-- Creer une RPC SECURITY DEFINER pour trouver un profil par email
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_profile_by_email(search_email TEXT)
RETURNS TABLE(id UUID, role TEXT) AS $$
  SELECT p.id, p.role FROM public.profiles p WHERE p.email = search_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';
