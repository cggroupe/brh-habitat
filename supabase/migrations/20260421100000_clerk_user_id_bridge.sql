-- Migration: Ajouter clerk_user_id sur profiles pour le bridge Clerk <-> Supabase
-- Date: 2026-04-21
-- Strategie: Clerk gere l'UI d'auth, Supabase garde son schema auth.users existant.
-- Chaque user a 2 identifiants :
--   - profiles.id (UUID Supabase) -> utilise par TOUTES les RLS existantes
--   - profiles.clerk_user_id (text) -> lien vers Clerk
-- Le webhook clerk-webhook maintient la synchronisation.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Index pour lookup rapide depuis le Clerk user ID
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id
  ON profiles(clerk_user_id) WHERE clerk_user_id IS NOT NULL;

-- Helper fonction : retourne le profiles.id depuis le Clerk user ID (utile en RLS)
-- SECURITY DEFINER pour bypass RLS (autrement recursion infinie sur profiles)
CREATE OR REPLACE FUNCTION public.profile_id_from_clerk(p_clerk_id TEXT)
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '' AS $$
  SELECT id FROM public.profiles WHERE clerk_user_id = p_clerk_id LIMIT 1;
$$;
