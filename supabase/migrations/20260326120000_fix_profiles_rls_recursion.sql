-- =============================================================================
-- 004 — Fix recursion RLS sur profiles (2026-03-26)
-- Les policies profiles_admin_select et profiles_update_own faisaient
-- un SELECT FROM profiles, declenchant les memes policies → recursion infinie.
-- Solution : utiliser des fonctions SECURITY DEFINER qui bypassen la RLS.
-- =============================================================================

-- Fonction SECURITY DEFINER pour recuperer le role du user courant
-- (bypass RLS, evite la recursion)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- =============================================================================
-- Supprimer les policies problematiques
-- =============================================================================
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- =============================================================================
-- Recreer sans recursion
-- =============================================================================

-- Admins: lecture de tous les profils (via is_admin() SECURITY DEFINER)
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT USING (public.is_admin());

-- Users: modification de leur propre profil SAUF le champ role
-- Utilise get_my_role() SECURITY DEFINER au lieu d'un sub-SELECT
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = public.get_my_role()
  );
