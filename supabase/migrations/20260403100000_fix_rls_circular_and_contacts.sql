-- Migration: Fix circular RLS policies + brh_contacts INSERT policy
-- Date: 2026-04-03
-- Issue: 4 tables use EXISTS (SELECT FROM profiles) instead of public.is_admin()
--        brh_contacts allows unauthenticated INSERT via WITH CHECK (true)

-- ============================================================
-- 1. brh_diagnostics — DROP circular policies, CREATE with is_admin()
-- ============================================================
DROP POLICY IF EXISTS "Admins can read all diagnostics" ON brh_diagnostics;
DROP POLICY IF EXISTS "Admins can update diagnostics" ON brh_diagnostics;

CREATE POLICY "Admins can manage all diagnostics"
  ON brh_diagnostics FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 2. brh_cases — DROP circular policy, CREATE with is_admin()
-- ============================================================
DROP POLICY IF EXISTS "Admins can CRUD all cases" ON brh_cases;

CREATE POLICY "Admins can manage all cases"
  ON brh_cases FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 3. brh_appointments — DROP circular + anonymous policies, CREATE unified
-- ============================================================
DROP POLICY IF EXISTS "Admins can CRUD all appointments" ON brh_appointments;
DROP POLICY IF EXISTS "Admins can manage anonymous appointments" ON brh_appointments;

CREATE POLICY "Admins can manage all appointments"
  ON brh_appointments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 4. brh_articles — DROP circular policy, CREATE with is_admin()
-- ============================================================
DROP POLICY IF EXISTS "Admins can CRUD all articles" ON brh_articles;

CREATE POLICY "Admins can manage all articles"
  ON brh_articles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- 5. brh_contacts — Fix overly permissive INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Anyone can create contacts" ON brh_contacts;

CREATE POLICY "Authenticated users can create contacts"
  ON brh_contacts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
