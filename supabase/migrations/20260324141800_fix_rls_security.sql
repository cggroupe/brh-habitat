-- =============================================================================
-- 002 — Correction securite RLS (audit 2026-03-24)
-- =============================================================================

-- =============================================================================
-- PROFILES — Separer les policies, bloquer UPDATE du champ role par les users
-- =============================================================================

-- Supprimer l'ancienne policy trop permissive (FOR ALL)
DROP POLICY IF EXISTS "profiles_own_data" ON profiles;

-- Users: lecture de leur propre profil
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Users: modification de leur propre profil SAUF le champ role
-- On utilise un WITH CHECK qui verifie que le role n'a pas change
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

-- Admins: lecture de tous les profils
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Admins: modification de tous les profils (y compris role)
-- Fonction SECURITY DEFINER pour eviter la recursion RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE USING (public.is_admin());

-- =============================================================================
-- DIAGNOSTICS — Exiger l'authentification pour INSERT
-- =============================================================================

-- Supprimer l'ancienne policy trop permissive
DROP POLICY IF EXISTS "Users can create diagnostics" ON brh_diagnostics;

-- Nouvelle policy : INSERT seulement si authentifie
CREATE POLICY "Authenticated users can create diagnostics" ON brh_diagnostics
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Permettre aux users de mettre a jour leurs propres diagnostics (manquait)
CREATE POLICY "Users can update own diagnostics" ON brh_diagnostics
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- CASES — Permettre aux users de creer/modifier leurs propres dossiers
-- =============================================================================

-- Supprimer l'ancienne policy user trop restrictive (SELECT only)
DROP POLICY IF EXISTS "Users can read own cases" ON brh_cases;

-- Users: CRUD complet sur leurs propres cases
CREATE POLICY "Users can manage own cases" ON brh_cases
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- HOMES — Ajouter DELETE pour les admins
-- =============================================================================

-- Supprimer les anciennes policies admin
DROP POLICY IF EXISTS "Admins can read all homes" ON brh_homes;
DROP POLICY IF EXISTS "Admins can update all homes" ON brh_homes;

-- Admins: acces complet (SELECT + UPDATE + DELETE)
CREATE POLICY "Admins can manage all homes" ON brh_homes
  FOR ALL USING (public.is_admin());

-- =============================================================================
-- APPOINTMENTS — Permettre aux users de modifier/annuler leurs RDV
-- =============================================================================

CREATE POLICY "Users can update own appointments" ON brh_appointments
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- ARTICLES — Admins lecture articles non publies (deja couvert par FOR ALL)
-- Pas de changement necessaire
-- =============================================================================
